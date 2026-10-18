//! The social-choice API as a Cloudflare Worker.
//!
//! [`api::router`] is an ordinary Axum router. On `wasm32` the Worker's `fetch`
//! event hands every request to it; static files (the Vue front end) are served
//! by Workers Static Assets before the Worker runs, see `wrangler.toml`.

pub mod api;

#[cfg(target_arch = "wasm32")]
mod worker_entry {
    use tower_service::Service;
    use worker::{event, Context, Env, HttpRequest, Result};

    #[event(fetch)]
    async fn fetch(req: HttpRequest, _env: Env, _ctx: Context) -> Result<axum::http::Response<axum::body::Body>> {
        console_error_panic_hook::set_once();
        Ok(crate::api::router().call(req).await?)
    }
}
