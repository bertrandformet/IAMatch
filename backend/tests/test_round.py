from app.main import Message, ROUND_SYSTEM_PROMPT, _build_round_messages


def test_build_round_messages_prepends_system_prompt():
    history = [
        Message(role="user", content="Contrairement à une IA, j'ai un corps"),
        Message(role="assistant", content="Contrairement à un humain, je ne me fatigue jamais."),
    ]
    messages = _build_round_messages(history, "Contrairement à une IA, je ressens des émotions")

    assert messages[0] == {"role": "system", "content": ROUND_SYSTEM_PROMPT}
    assert messages[1] == {"role": "user", "content": "Contrairement à une IA, j'ai un corps"}
    assert messages[2] == {"role": "assistant", "content": "Contrairement à un humain, je ne me fatigue jamais."}
    assert messages[3] == {"role": "user", "content": "Contrairement à une IA, je ressens des émotions"}


def test_build_round_messages_empty_history():
    messages = _build_round_messages([], "Contrairement à une IA, j'ai un corps")
    assert messages == [
        {"role": "system", "content": ROUND_SYSTEM_PROMPT},
        {"role": "user", "content": "Contrairement à une IA, j'ai un corps"},
    ]
