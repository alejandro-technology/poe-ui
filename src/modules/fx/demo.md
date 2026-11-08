# FX module — integration (T3)

## 1. Mount `<FxLayer/>` before `<App/>`

`FxLayer` is `position: fixed; inset: 0; z-index: 0; pointer-events: none` and
renders at half device resolution. The app container only needs to sit above it
(`position: relative; z-index: 10`), which T1 already applies. No extra wrapper
is required.

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FxLayer } from "./modules/fx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FxLayer />
    <App />
  </React.StrictMode>,
);
```

## 2. Orb in the Composer

Place it as the first child of the composer row, before the textarea:

```tsx
// src/modules/chat/components/Composer.tsx
import { Orb, useOrbEnergy } from "../../fx";

// inside Composer()
const { state, setEnergy } = useOrbEnergy();

return (
  <div className="composer">
    <Orb size={96} state={state} />
    <textarea /* … unchanged … */ />
    <button /* … unchanged … */>Enviar</button>
  </div>
);
```

Empty state hero uses the same component at `160`:

```tsx
<Orb size={160} state={state} />
```

## 3. Energy mapping from chat state

Compute the visual state from the chat hook and push it into `setEnergy`:

```tsx
// ChatLayout.tsx (or Composer if it receives these values)
const lastMessage = messages[messages.length - 1];
const streamingLast = lastMessage?.status === "streaming";

useEffect(() => {
  if (sendError) {
    setEnergy("error");
  } else if (isSending && messages.length === 0) {
    setEnergy("thinking");
  } else if (streamingLast) {
    setEnergy("streaming");
  } else {
    setEnergy("idle");
  }
}, [sendError, isSending, messages.length, streamingLast, setEnergy]);
```

Rule summary:

| condition                         | state       |
| --------------------------------- | ----------- |
| `sendError` truthy                | `"error"`   |
| `isSending && messages.length===0`| `"thinking"`|
| last message `status==="streaming"` | `"streaming"` |
| otherwise                         | `"idle"`    |

`useOrbEnergy` exposes `intensity` (0..1) already tweened with rAF if a CSS
consumer needs it; `<Orb/>` tweens its own `uEnergy` from `state`.

## 4. Shimmer text

The module imports `fx.css` through the barrel. Use the class on the
"Poe está pensando…" chip label:

```tsx
<span className="fx-shimmer">Poe está pensando…</span>
```
