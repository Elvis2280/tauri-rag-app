fn main() {
    println!("cargo:rerun-if-changed=../.env");
    let env_aliases = [
        (
            "RAG_API_BASE_URL",
            ["RAG_API_BASE_URL", "VITE_API_BASE_URL"],
        ),
        ("RAG_WS_BASE_URL", ["RAG_WS_BASE_URL", "VITE_WS_BASE_URL"]),
    ];
    let file_values = std::fs::read_to_string("../.env").ok().map(|contents| {
        contents
            .lines()
            .filter_map(|line| line.split_once('='))
            .map(|(name, value)| (name.trim().to_string(), value.trim().to_string()))
            .collect::<std::collections::HashMap<_, _>>()
    });
    for (target, aliases) in env_aliases {
        if std::env::var_os(target).is_none() {
            if let Some(value) = aliases
                .iter()
                .find_map(|alias| file_values.as_ref()?.get(*alias))
            {
                println!("cargo:rustc-env={target}={value}");
            }
        }
    }
    tauri_build::build()
}
