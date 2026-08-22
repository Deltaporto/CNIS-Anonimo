## 2024-05-27 - Replace innerHTML state caching with DOM node cloning to prevent DOM-based XSS
**Vulnerability:** The application temporarily stores and restores UI states (specifically button contents like btnLimpar and btnBaixarZip) by saving and re-assigning .innerHTML strings.
**Learning:** While the strings being saved in this specific instance may originate from static HTML initially, assigning raw HTML strings via .innerHTML during state restoration is a well-known anti-pattern that can introduce DOM-based Cross-Site Scripting (XSS).
**Prevention:** Avoid using .innerHTML to snapshot and restore DOM states. Instead, capture the actual child nodes using Array.from(element.childNodes) and restore them by cloning the nodes and using element.replaceChildren(...clonedNodes).
