type SSECallback = (eventType: string, data: unknown) => void;

interface Subscriber {
  id: string;
  callback: SSECallback;
}

class SSEEventBus {
  private subscribers: Map<string, Subscriber[]> = new Map();
  private subscriberCounter = 0;

  /**
   * Subscribe to events for a specific party.
   * Returns an unsubscribe function.
   */
  subscribe(partyId: string, callback: SSECallback): () => void {
    const id = String(++this.subscriberCounter);
    const subscriber: Subscriber = { id, callback };

    const existing = this.subscribers.get(partyId) || [];
    existing.push(subscriber);
    this.subscribers.set(partyId, existing);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(partyId);
      if (subs) {
        const filtered = subs.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          this.subscribers.delete(partyId);
        } else {
          this.subscribers.set(partyId, filtered);
        }
      }
    };
  }

  /**
   * Publish an event to all subscribers of a party.
   * Event types: 'menu-update', 'request-update', 'new-request'
   */
  publish(partyId: string, eventType: string, data: unknown): void {
    const subs = this.subscribers.get(partyId);
    if (subs) {
      for (const sub of subs) {
        try {
          sub.callback(eventType, data);
        } catch {
          // Don't let one subscriber's error affect others
        }
      }
    }
  }
}

// Singleton instance - survives hot reloads in development
const globalForSSE = globalThis as unknown as {
  sseEventBus: SSEEventBus | undefined;
};

export const sseEventBus = globalForSSE.sseEventBus ?? new SSEEventBus();

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.sseEventBus = sseEventBus;
}
