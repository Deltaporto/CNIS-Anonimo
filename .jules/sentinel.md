## 2024-08-19 - Safe DOM State Restoration
**Vulnerability:** DOM-based XSS via `.innerHTML` caching for state restoration and string interpolation for dynamic button states.
**Learning:** Using `btnLimpar.dataset.original = btnLimpar.innerHTML` followed by restoration converts the active DOM state to a raw string and reparses it. When `innerHTML` is used for dynamic content insertion, it introduces a potential XSS vector if any configuration value isn't properly escaped.
**Prevention:** Cache actual DOM nodes using `Array.from(element.childNodes)` and clone them during restoration with `.replaceChildren(...nodes.map(n => n.cloneNode(true)))`. For inserting UI, use `.insertAdjacentHTML()` for safe static structures and `.textContent` for dynamic values.
