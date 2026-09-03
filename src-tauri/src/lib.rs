use std::collections::HashMap;
use std::sync::Arc;

use base64::Engine;
use futures_util::StreamExt;
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{ipc::Channel, State};
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;

const KEYRING_SERVICE: &str = "com.elvis.rag-desktop";
const KEYRING_USER: &str = "backend-api-key";
const DEFAULT_API_BASE_URL: &str = "http://localhost:8080/api/v1";
const DEFAULT_WS_BASE_URL: &str = "ws://localhost:8080";
const MAX_UPLOAD_BYTES: usize = 100 * 1024 * 1024;

fn api_base_url() -> String {
    option_env!("RAG_API_BASE_URL")
        .unwrap_or(DEFAULT_API_BASE_URL)
        .trim_end_matches('/')
        .to_string()
}

fn ws_base_url() -> String {
    option_env!("RAG_WS_BASE_URL")
        .unwrap_or(DEFAULT_WS_BASE_URL)
        .trim_end_matches('/')
        .to_string()
}

fn credential_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|error| error.to_string())
}

fn read_api_key() -> Result<String, String> {
    credential_entry()?
        .get_password()
        .map_err(|error| match error {
            keyring::Error::NoEntry => "API key is not configured".to_string(),
            _ => "Unable to read the saved API credential".to_string(),
        })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialStatus {
    configured: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonApiRequest {
    method: String,
    path: String,
    body: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse {
    pub status: u16,
    pub body: Value,
}

#[derive(Debug, Serialize)]
pub struct ProgressEvent {
    pub payload: Option<Value>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UploadMetadata {
    workspace_id: String,
    filename: String,
    mime_type: String,
}

#[derive(Clone, Default)]
pub struct AppState {
    watches: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
}

fn endpoint_url(path: &str) -> Result<reqwest::Url, String> {
    if path.is_empty() || path.starts_with('/') || path.contains("..") || path.contains(':') {
        return Err("Invalid API path".to_string());
    }

    let allowed = match path {
        "workspace/list" | "workspace/tree" | "workspace" | "documents/upload" | "chat" => true,
        value if value.starts_with("workspace/") => {
            let parts: Vec<&str> = value.split('/').collect();
            parts.len() == 3 && parts[2] == "disable" && uuid::Uuid::parse_str(parts[1]).is_ok()
        }
        _ => false,
    };
    if !allowed {
        return Err("API endpoint is not allowed".to_string());
    }

    reqwest::Url::parse(&format!("{}/{}", api_base_url(), path))
        .map_err(|_| "Invalid configured API address".to_string())
}

async fn json_body(response: reqwest::Response) -> Result<ApiResponse, String> {
    let status = response.status().as_u16();
    let body = response
        .json::<Value>()
        .await
        .unwrap_or_else(|_| Value::Null);
    Ok(ApiResponse { status, body })
}

async fn authenticated_client() -> Result<(reqwest::Client, String), String> {
    let key = read_api_key()?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|_| "Unable to initialize the API client".to_string())?;
    Ok((client, key))
}

#[tauri::command]
async fn get_credential_status() -> Result<CredentialStatus, String> {
    let configured = match credential_entry()?.get_password() {
        Ok(_) => true,
        Err(keyring::Error::NoEntry) => false,
        Err(_) => return Err("Unable to access the operating system credential vault".to_string()),
    };
    Ok(CredentialStatus { configured })
}

#[tauri::command]
async fn validate_and_save_credential(api_key: String) -> Result<(), String> {
    let key = api_key.trim();
    if key.is_empty() || key.len() > 4096 {
        return Err("Enter a valid API key".to_string());
    }

    let url = endpoint_url("workspace/list")?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|_| "Unable to initialize the API client".to_string())?;
    let response = client
        .get(url)
        .header("X-API-Key", key)
        .send()
        .await
        .map_err(|_| "Unable to reach the RAG API".to_string())?;

    if !response.status().is_success() {
        return Err(if response.status().as_u16() == 401 {
            "The API key was rejected".to_string()
        } else {
            "The API did not accept this credential".to_string()
        });
    }

    credential_entry()?
        .set_password(key)
        .map_err(|_| "Unable to save the API credential".to_string())
}

#[tauri::command]
async fn clear_credential() -> Result<(), String> {
    match credential_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("Unable to remove the API credential".to_string()),
    }
}

#[tauri::command]
async fn api_request(request: JsonApiRequest) -> Result<ApiResponse, String> {
    let (client, key) = authenticated_client().await?;
    let url = endpoint_url(&request.path)?;
    let response = match request.method.as_str() {
        "GET" if request.body.is_none() => client.get(url).header("X-API-Key", key).send().await,
        "POST" => {
            client
                .post(url)
                .header("X-API-Key", key)
                .json(&request.body.unwrap_or(Value::Null))
                .send()
                .await
        }
        _ => return Err("Unsupported API request".to_string()),
    }
    .map_err(|_| "Unable to reach the RAG API".to_string())?;

    json_body(response).await
}

#[tauri::command]
async fn upload_document(request: tauri::ipc::Request<'_>) -> Result<ApiResponse, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Upload payload must be raw bytes".to_string());
    };
    if bytes.len() > MAX_UPLOAD_BYTES {
        return Err("The selected file is too large".to_string());
    }

    let metadata_header = request
        .headers()
        .get("x-upload-metadata")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "Upload metadata is missing".to_string())?;
    let metadata_bytes = base64::engine::general_purpose::STANDARD
        .decode(metadata_header)
        .map_err(|_| "Upload metadata is invalid".to_string())?;
    let metadata: UploadMetadata = serde_json::from_slice(&metadata_bytes)
        .map_err(|_| "Upload metadata is invalid".to_string())?;
    if metadata.workspace_id.is_empty()
        || metadata.filename.is_empty()
        || metadata.filename.len() > 255
        || metadata.mime_type.is_empty()
    {
        return Err("Upload metadata is invalid".to_string());
    }

    let (client, key) = authenticated_client().await?;
    let part = Part::bytes(bytes.clone())
        .file_name(metadata.filename)
        .mime_str(&metadata.mime_type)
        .map_err(|_| "Upload MIME type is invalid".to_string())?;
    let form = Form::new()
        .text("workspace_id", metadata.workspace_id)
        .part("file", part);
    let response = client
        .post(endpoint_url("documents/upload")?)
        .header("X-API-Key", key)
        .multipart(form)
        .send()
        .await
        .map_err(|_| "Unable to reach the RAG API".to_string())?;
    json_body(response).await
}

#[tauri::command]
async fn watch_document(
    file_id: String,
    channel: Channel<ProgressEvent>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    uuid::Uuid::parse_str(&file_id).map_err(|_| "Invalid document ID".to_string())?;
    let key = read_api_key()?;
    let mut request = format!("{}/api/v1/documents/{file_id}/ws", ws_base_url())
        .into_client_request()
        .map_err(|_| "Invalid configured WebSocket address".to_string())?;
    request.headers_mut().insert(
        "X-API-Key",
        key.parse()
            .map_err(|_| "Invalid API credential".to_string())?,
    );

    let (mut socket, _) = tokio_tungstenite::connect_async(request)
        .await
        .map_err(|_| "Unable to connect to the document status stream".to_string())?;
    let handle = tokio::spawn(async move {
        let mut terminal = false;
        while let Some(message) = socket.next().await {
            let Ok(message) = message else { break };
            if let tokio_tungstenite::tungstenite::Message::Text(text) = message {
                let Ok(payload) = serde_json::from_str::<Value>(&text) else {
                    continue;
                };
                terminal = matches!(
                    payload.get("status").and_then(Value::as_str),
                    Some("completed" | "failed")
                );
                let _ = channel.send(ProgressEvent {
                    payload: Some(payload),
                    error: None,
                });
                if terminal {
                    break;
                }
            }
        }
        if !terminal {
            let _ = channel.send(ProgressEvent {
                payload: None,
                error: Some("Document status stream disconnected".to_string()),
            });
        }
    });
    state.watches.lock().await.insert(file_id, handle);
    Ok(())
}

#[tauri::command]
async fn stop_document_watch(file_id: String, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(handle) = state.watches.lock().await.remove(&file_id) {
        handle.abort();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_credential_status,
            validate_and_save_credential,
            clear_credential,
            api_request,
            upload_document,
            watch_document,
            stop_document_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::endpoint_url;

    #[test]
    fn endpoint_allowlist_accepts_supported_routes() {
        assert!(endpoint_url("workspace/list").is_ok());
        assert!(endpoint_url("workspace/tree").is_ok());
        assert!(endpoint_url("chat").is_ok());
    }

    #[test]
    fn endpoint_allowlist_rejects_absolute_and_unknown_routes() {
        assert!(endpoint_url("https://example.com/chat").is_err());
        assert!(endpoint_url("admin/secrets").is_err());
        assert!(endpoint_url("workspace/not-a-uuid/disable").is_err());
        assert!(endpoint_url("workspace/../chat").is_err());
    }
}
