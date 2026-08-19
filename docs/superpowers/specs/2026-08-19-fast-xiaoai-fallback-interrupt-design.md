# Fast XiaoAI Fallback Interrupt Design

## Goal

Interrupt a XiaoAI fallback response as soon as its answer text becomes visible through the conversation API, play “正在思考中”, and then play the non-streaming external LLM result. Useful native XiaoAI answers must remain uninterrupted.

## Constraints

- Fallback classification depends on XiaoAI's generated answer text, so interruption cannot happen before the conversation API exposes that text.
- Continuous high-frequency polling would increase Xiaomi API load. Fast polling must only run while a newly observed conversation record is waiting for its answer.
- The L05B keeps using the MIoT `5/3` text action for “正在思考中” and the final LLM answer.
- Only the `migpt-next` Docker container belongs to this change.

## Design

### Adaptive conversation polling

The message reader will fetch conversation records without discarding records whose `answers` array is not ready yet. When the newest record is newer than the last handled message but has no extractable TTS or LLM answer, the reader will temporarily poll that pending record at a short interval. It will return the message immediately once its native answer appears.

The fast polling loop will be bounded. If the answer is still unavailable at the end of the window, the reader will return control to the normal heartbeat loop without advancing the last-handled cursor. A later iteration can continue observing the same record. This preserves the current behavior for unsupported answer types and API delays while avoiding continuous high-frequency traffic.

Conversation `requestId` values will be used as message identifiers when available so repeated reads of a pending record retain a stable identity.

### Fallback handling

`config.onMessage` remains the policy boundary:

1. A useful native answer returns `{ handled: true }` without issuing any playback command.
2. A recognized fallback answer immediately calls `speaker.abortXiaoAI()`.
3. The stop result is checked and a warning is logged if the device rejects or cannot perform the stop.
4. The MIoT `5/3` action plays “正在思考中”.
5. The external LLM is called with `{ stream: false }`.
6. A non-empty LLM result is played through the same MIoT action.

`SpeakerManager.abortXiaoAI()` will return the actual result of `MiNA.stop()` instead of always returning `false`. No retry is added to the critical path because retrying would delay the thinking prompt.

## Error Handling

- A pending answer timeout does not consume the message cursor.
- A failed stop is visible in logs, but does not prevent the thinking prompt or LLM fallback.
- Existing LLM error behavior remains unchanged.
- Normal XiaoAI answers never enter the stop or external LLM path.

## Testing

- Add a message-reader regression test in which a new record is initially missing `answers`, then gains a fallback TTS answer during the fast polling window. Verify the message is emitted without waiting for another normal heartbeat.
- Add a timeout regression test proving an unanswered record is not consumed.
- Verify `abortXiaoAI()` returns the underlying `MiNA.stop()` result.
- Extend the config test to verify a failed stop still proceeds immediately to the thinking prompt and LLM.
- Run the full test suite and workspace build.

## Deployment Verification

Build the workspace, build `migpt-next-local:latest` from `Dockerfile.local`, recreate only the existing `migpt-next` container with the same bind mount and runtime configuration, and verify its startup logs and running state.
