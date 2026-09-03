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
#[cfg(target_os = "windows")]
const KEYRING_TARGET: &str = "com.elvis.rag-desktop/backend-api-key";
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

#[cfg(target_os = "windows")]
type CredentialEntry = keyring_core::Entry;

#[cfg(not(target_os = "windows"))]
type CredentialEntry = keyring::Entry;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialCommandError {
    pub code: String,
    pub message: String,
}

fn credential_error(code: &str, message: &str) -> CredentialCommandError {
    CredentialCommandError {
        code: code.to_string(),
        message: message.to_string(),
    }
}

fn api_validation_error(status: u16) -> CredentialCommandError {
    if matches!(status, 401 | 403) {
        credential_error("rejected", "The API key was rejected")
    } else if status == 404 {
        credential_error(
            "configuration",
            "The API endpoint was not found; check that the address ends in /api/v1",
        )
    } else {
        credential_error("backend", &format!("The API returned HTTP {status}"))
    }
}

fn map_vault_error(code: &str, error: &keyring::Error) -> CredentialCommandError {
    if code == "vault_read" && matches!(error, keyring::Error::NoEntry) {
        credential_error("not_configured", "API key is not configured")
    } else {
        credential_error(
            code,
            "Unable to access the operating system credential vault",
        )
    }
}

#[cfg(target_os = "windows")]
fn credential_entry() -> Result<CredentialEntry, CredentialCommandError> {
    use keyring_core::api::CredentialStoreApi;
    use std::collections::HashMap;

    let store = windows_native_keyring_store::Store::new().map_err(|_| {
        credential_error(
            "vault_initialization",
            "Unable to initialize Windows Credential Manager",
        )
    })?;
    let modifiers = HashMap::from([("target", KEYRING_TARGET), ("persistence", "Local")]);
    store
        .build(KEYRING_SERVICE, KEYRING_USER, Some(&modifiers))
        .map_err(|_| {
            credential_error(
                "vault_initialization",
                "Unable to initialize Windows Credential Manager",
            )
        })
}

#[cfg(not(target_os = "windows"))]
fn credential_entry() -> Result<CredentialEntry, CredentialCommandError> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|_| {
        credential_error(
            "vault_initialization",
            "Unable to initialize the operating system credential vault",
        )
    })
}

fn read_api_key() -> Result<String, CredentialCommandError> {
    credential_entry()?
        .get_password()
        .map_err(|error| map_vault_error("vault_read", &error))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialStatus {
    configured: bool,
    api_base_url: String,
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
    let key = read_api_key().map_err(|error| error.message)?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|_| "Unable to initialize the API client".to_string())?;
    Ok((client, key))
}

#[tauri::command]
async fn get_credential_status() -> Result<CredentialStatus, CredentialCommandError> {
    let configured = match credential_entry()?.get_password() {
        Ok(_) => true,
        Err(keyring::Error::NoEntry) => false,
        Err(error) => return Err(map_vault_error("vault_read", &error)),
    };
    Ok(CredentialStatus {
        configured,
        api_base_url: api_base_url(),
    })
}

async fn validate_api_key(
    client: &reqwest::Client,
    url: &reqwest::Url,
    key: &str,
) -> Result<reqwest::Response, CredentialCommandError> {
    for attempt in 0..2 {
        match client
            .get(url.clone())
            .header("X-API-Key", key)
            .send()
            .await
        {
            Ok(response) => return Ok(response),
            Err(error) if attempt == 0 && (error.is_connect() || error.is_timeout()) => {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
            Err(_) => {
                return Err(credential_error(
                    "connection",
                    "Unable to reach the RAG API",
                ));
            }
        }
    }

    Err(credential_error(
        "connection",
        "Unable to reach the RAG API",
    ))
}

#[tauri::command]
async fn validate_and_save_credential(api_key: String) -> Result<(), CredentialCommandError> {
    let key = api_key.trim().to_string();
    if key.is_empty() || key.len() > 4096 {
        return Err(credential_error("invalid_key", "Enter a valid API key"));
    }

    let url = endpoint_url("workspace/list")
        .map_err(|_| credential_error("configuration", "Invalid configured API address"))?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|_| credential_error("client", "Unable to initialize the API client"))?;
    let response = validate_api_key(&client, &url, &key).await?;

    if !response.status().is_success() {
        return Err(api_validation_error(response.status().as_u16()));
    }

    let entry = credential_entry()?;
    entry
        .set_password(&key)
        .map_err(|error| map_vault_error("vault_write", &error))?;
    match entry.get_password() {
        Ok(saved_key) if saved_key == key => Ok(()),
        Ok(_) => {
            let _ = entry.delete_credential();
            Err(credential_error(
                "vault_verification",
                "The saved API credential could not be verified",
            ))
        }
        Err(error) => {
            let _ = entry.delete_credential();
            Err(map_vault_error("vault_verification", &error))
        }
    }
}

#[tauri::command]
async fn clear_credential() -> Result<(), CredentialCommandError> {
    match credential_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(map_vault_error("vault_deletion", &error)),
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
    let key = read_api_key().map_err(|error| error.message)?;
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
    use super::{api_validation_error, endpoint_url};

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

    #[test]
    fn api_validation_statuses_are_mapped_without_sensitive_data() {
        // 1. ARRANGE
        let cases = [
            (401, "rejected", "The API key was rejected"),
            (403, "rejected", "The API key was rejected"),
            (404, "configuration", "The API endpoint was not found"),
            (503, "backend", "The API returned HTTP 503"),
        ];

        // 2. ACT
        let errors = cases
            .iter()
            .map(|(status, _, _)| api_validation_error(*status))
            .collect::<Vec<_>>();

        // 3. ASSERT
        for ((_, expected_code, expected_message), error) in cases.iter().zip(errors) {
            assert_eq!(&error.code, expected_code);
            assert!(error.message.contains(expected_message));
            assert!(!error.message.contains("X-API-Key"));
        }
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_credential_store_round_trip() {
        use keyring_core::api::CredentialStoreApi;
        use std::collections::HashMap;
        use std::time::{SystemTime, UNIX_EPOCH};

        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be available")
            .as_nanos();
        let target = format!("rag-desktop-smoke-{suffix}");
        let secret = format!("smoke-secret-{suffix}");
        let store = windows_native_keyring_store::Store::new()
            .expect("Windows Credential Manager should initialize");
        let modifiers = HashMap::from([("target", target.as_str()), ("persistence", "Local")]);
        let entry = store
            .build("rag-desktop-smoke", "test-user", Some(&modifiers))
            .expect("credential entry should be created");

        entry
            .set_password(&secret)
            .expect("credential should be written");
        assert_eq!(
            entry.get_password().expect("credential should be readable"),
            secret
        );
        entry
            .delete_credential()
            .expect("credential should be deleted");
    }
}
