// Presentation-only edge detection: consume a cue even while muted so unmuting
// never replays old ticks. The scene polls only while its simulation is running.
export class DeploymentCues {
  private enabled = false;
  private previous: number | null = null;
  reset(enabled: boolean) {
    this.enabled = enabled;
    this.previous = null;
  }
  poll(seconds: number): number | null {
    if (!this.enabled || seconds === this.previous) return null;
    this.previous = seconds;
    if (seconds === 0) this.enabled = false;
    return seconds;
  }
}
