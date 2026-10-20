//! The social-choice library as a JSON API that runs in the browser.
//!
//! [`api::handle`] does the work and knows nothing of HTTP or JavaScript, so it
//! is tested natively. On `wasm32`, [`call`] exposes it to JavaScript; the
//! front end runs it in Web Workers (`frontend/src/engine`).

pub mod api;

#[cfg(target_arch = "wasm32")]
mod bindings {
    use social_choice::Lang;
    use wasm_bindgen::prelude::*;

    /// Runs one endpoint on a JSON body (ignored by the catalogue endpoints) and
    /// returns the JSON answer. Errors are thrown as an `Error` whose message is
    /// written in `lang`.
    #[wasm_bindgen]
    pub fn call(endpoint: &str, lang: &str, body: &str) -> Result<String, JsError> {
        let lang: Lang = lang.parse().unwrap_or_default();
        crate::api::handle(endpoint, lang, body).map_err(|e| JsError::new(e.message()))
    }
}
