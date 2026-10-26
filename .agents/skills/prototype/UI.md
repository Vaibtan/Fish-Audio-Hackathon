# UI alternatives

Prefer the existing page or component context so alternatives face realistic
content, density and navigation. Use disposable variants or a clearly marked
prototype route when no suitable host exists. Preserve the application's routing,
component library, accessibility and styling conventions.

Make alternatives differ on the question being decided: information hierarchy,
layout, interaction or primary action. Choose enough variants to expose a real
tradeoff; recoloring one layout is not a meaningful alternative.

Use read-only data or bounded stand-ins. Provide a simple comparison mechanism,
such as a URL variant parameter, when it helps the user compare. Inspect the result
in a browser when available, including relevant states and input behavior.

Capture the selected direction and why. Remove obsolete switchers/variants when
integrating the decision, and verify the resulting production behavior normally.
