# Logic experiment

Use a small executable program or focused test when developers need to answer a
logic/API question. Use a self-contained HTML demo when someone needs to drive
the state interactively or share it without a development environment.

Keep the model separate from presentation. Show the relevant state and outcome
after each action. Include a representative happy path, disputed transition or
edge case that distinguishes the alternatives. A demo may use buttons and guided
scenarios, but an HTML shell is unnecessary for a purely computational question.

Measure or assert the property being investigated. Distinguish a model simulation
from evidence about real storage, concurrency, process restarts or providers.
Record which decision the experiment supports and which assumptions it leaves open.
