---
name: prototype
description: Build a bounded experiment to answer a design, state-model, or UI question.
---

# Prototype

State the question and what observation would settle it. Choose the smallest
useful artifact: an executable logic experiment, a shareable state demo, or UI
variants in the existing application.

- For logic and state questions, use [LOGIC.md](LOGIC.md).
- For visual alternatives, use [UI.md](UI.md).

Mark the artifact as a prototype and follow existing workspace conventions. Keep
state disposable and avoid real provider writes; use real storage only when
storage behavior is the actual question and the target is authorized.

Verification should establish that the experiment runs and answers its question.
Add tests only when they are the useful experiment or lock down an adopted
decision. Production promotion requires normal implementation and verification,
including error handling and integration concerns the prototype omitted.

Record the verdict and relevant evidence where the project keeps decisions.
Keep, remove or isolate the experiment according to the task; it does not require
an automatic commit, throwaway branch, issue update or publication.
