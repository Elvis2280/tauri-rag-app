use std::path::{Path, PathBuf};

use reqwest::Url;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

const DEFAULT_API_BASE_URL: &str = "http://localhost:8080/api/v1";
const DEFAULT_WS_BASE_URL: &str = "ws://localhost:8080";
const MAX_SERVER_HOST_LENGTH: usize = 2048;

#[derive(Clone, Debug, PartialEq)]
pub struct AccessConfig {
    pub server_host: String,
    pub api_base_url: String,
    pub ws_base_url: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredAccessSettings {
    server_host: String,
}

impl AccessConfig {
    fn compiled() -> Self {
        let api_base_url = option_env!("RAG_API_BASE_URL")
            .unwrap_or(DEFAULT_API_BASE_URL)
            .trim_end_matches('/')
            .to_string();
        let ws_base_url = option_env!("RAG_WS_BASE_URL")
            .unwrap_or(DEFAULT_WS_BASE_URL)
            .trim_end_matches('/')
            .to_string();
        let server_host = Url::parse(&api_base_url)
            .map(|url| url.origin().ascii_serialization())
            .unwrap_or_else(|_| "http://localhost:8080".to_string());

        Self {
            server_host,
            api_base_url,
            ws_base_url,
        }
    }
}

pub struct AccessSettingsStore {
    config: RwLock<AccessConfig>,
    settings_path: PathBuf,
}

impl AccessSettingsStore {
    pub fn load(settings_path: PathBuf) -> Self {
        let config = load_server_host(&settings_path)
            .and_then(|host| normalize_server_host(&host).ok())
            .unwrap_or_else(AccessConfig::compiled);

        Self {
            config: RwLock::new(config),
            settings_path,
        }
    }

    pub async fn current(&self) -> AccessConfig {
        self.config.read().await.clone()
    }

    pub async fn save_server_host(&self, config: AccessConfig) -> Result<(), String> {
        persist_server_host(&self.settings_path, &config.server_host)?;
        *self.config.write().await = config;
        Ok(())
    }
}

fn load_server_host(path: &Path) -> Option<String> {
    let contents = std::fs::read_to_string(path).ok()?;
    serde_json::from_str::<StoredAccessSettings>(&contents)
        .ok()
        .map(|settings| settings.server_host)
}

fn persist_server_host(path: &Path, server_host: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Unable to resolve the API settings directory".to_string())?;
    std::fs::create_dir_all(parent)
        .map_err(|_| "Unable to create the API settings directory".to_string())?;

    let contents = serde_json::to_vec_pretty(&StoredAccessSettings {
        server_host: server_host.to_string(),
    })
    .map_err(|_| "Unable to serialize the API settings".to_string())?;
    let temporary_path = path.with_extension("json.tmp");
    let backup_path = path.with_extension("json.bak");

    std::fs::write(&temporary_path, contents)
        .map_err(|_| "Unable to write the API settings".to_string())?;

    let had_existing = path.exists();
    if had_existing {
        let _ = std::fs::remove_file(&backup_path);
        std::fs::rename(path, &backup_path).map_err(|_| {
            let _ = std::fs::remove_file(&temporary_path);
            "Unable to prepare the existing API settings".to_string()
        })?;
    }

    if std::fs::rename(&temporary_path, path).is_err() {
        if had_existing {
            let _ = std::fs::rename(&backup_path, path);
        }
        let _ = std::fs::remove_file(&temporary_path);
        return Err("Unable to save the API settings".to_string());
    }

    if had_existing {
        let _ = std::fs::remove_file(backup_path);
    }
    Ok(())
}

pub fn normalize_server_host(value: &str) -> Result<AccessConfig, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_SERVER_HOST_LENGTH {
        return Err("Enter a valid server hostname or IP address".to_string());
    }

    let address = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("http://{trimmed}")
    };
    let mut url = Url::parse(&address)
        .map_err(|_| "Enter a valid server hostname or IP address".to_string())?;

    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || !matches!(url.path(), "" | "/")
    {
        return Err(
            "Use an HTTP(S) hostname or IP address without a path, query, or credentials"
                .to_string(),
        );
    }

    let server_host = url.origin().ascii_serialization();
    let api_base_url = format!("{server_host}/api/v1");
    let websocket_scheme = if url.scheme() == "https" { "wss" } else { "ws" };
    url.set_scheme(websocket_scheme)
        .map_err(|_| "Unable to derive the WebSocket address".to_string())?;
    url.set_path("");
    let ws_base_url = url.as_str().trim_end_matches('/').to_string();

    Ok(AccessConfig {
        server_host,
        api_base_url,
        ws_base_url,
    })
}

#[cfg(test)]
mod tests {
    use super::{load_server_host, normalize_server_host, persist_server_host};

    #[test]
    fn normalizes_hostname_ip_port_and_tls_addresses() {
        // 1. ARRANGE
        let cases = [
            ("localhost", "http://localhost", "ws://localhost"),
            (
                "192.168.1.20:8080/",
                "http://192.168.1.20:8080",
                "ws://192.168.1.20:8080",
            ),
            (
                "https://rag.example.com:8443",
                "https://rag.example.com:8443",
                "wss://rag.example.com:8443",
            ),
        ];

        // 2. ACT
        let configs = cases
            .iter()
            .map(|(value, _, _)| normalize_server_host(value).expect("address should be valid"))
            .collect::<Vec<_>>();

        // 3. ASSERT
        for ((_, expected_host, expected_ws), config) in cases.iter().zip(configs) {
            assert_eq!(&config.server_host, expected_host);
            assert_eq!(&config.api_base_url, &format!("{expected_host}/api/v1"));
            assert_eq!(&config.ws_base_url, expected_ws);
        }
    }

    #[test]
    fn rejects_unsafe_or_malformed_server_addresses() {
        // 1. ARRANGE
        let invalid = [
            "ftp://example.com",
            "https://user:secret@example.com",
            "https://example.com/api/v1",
            "https://example.com?debug=true",
            "https://example.com#section",
            "not a host",
        ];

        // 2. ACT
        let results = invalid.map(normalize_server_host);

        // 3. ASSERT
        assert!(results.iter().all(Result::is_err));
    }

    #[test]
    fn persists_and_reloads_a_canonical_server_host() {
        // 1. ARRANGE
        let suffix = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be available")
            .as_nanos();
        let directory = std::env::temp_dir().join(format!("rag-desktop-{suffix}"));
        let path = directory.join("api-access.json");
        let config =
            normalize_server_host("https://rag.example.com:8443").expect("address should be valid");

        // 2. ACT
        persist_server_host(&path, &config.server_host).expect("settings should save");
        let persisted = load_server_host(&path).expect("settings should reload");

        // 3. ASSERT
        assert_eq!(persisted, config.server_host);
        std::fs::remove_dir_all(directory).expect("temporary settings should be removable");
    }
}
