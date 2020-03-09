/**
 * Effect allows to call Action in async moment.
 * Seems like redux-thunk but it comes from reducer (update)
 * but not from action.
 * This small difference makes possible to get rid of properties
 * and handlers drilling and keep all state global at the same time
 * when the app becomes bigger and bigger.
 */
export type Effect<Action> = (dispatch: Dispatch<Action>) => void;

export type Dispatch<Action> = (action: Action) => void;

/**
 * State machine to handle incoming actions and effects.
 */
export interface Program<Action, State> {
  getState(): State;
  dispatch(action: Action): void;
  subscribe(subscriber: () => void): () => void;
}

class ClientProgram<Action, State> implements Program<Action, State> {
  public dispatch: (action: Action) => void;

  private state: State;

  private readonly subscribers: Array<() => void> = [];

  private readonly update: (
    action: Action,
    state: State,
  ) => [State, Array<Effect<Action>>];

  public constructor(
    [initialState, initialEffects]: [State, Array<Effect<Action>>],
    update: (action: Action, state: State) => [State, Array<Effect<Action>>],
  ) {
    this.state = initialState;
    this.update = update;

    this.dispatch = (action: Action): void => {
      const [nextState, effects] = this.update(action, this.state);

      if (this.state === nextState) {
        this.executeEffects(effects);

        return;
      }

      this.state = nextState;
      this.executeEffects(effects);

      for (const subscriber of this.subscribers) {
        subscriber();
      }
    };

    this.executeEffects(initialEffects);
  }

  public getState(): State {
    return this.state;
  }

  public subscribe(subscriber: () => void): () => void {
    this.subscribers.push(subscriber);

    return (): void => {
      const index = this.subscribers.indexOf(subscriber);

      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private executeEffects(effects: Array<Effect<Action>>): void {
    for (const effect of effects) {
      effect(this.dispatch);
    }
  }
}

/**
 * Creates state machine.
 */
export const Program = {
  run<Flags, Action, State>({
    flags,
    init,
    update,
  }: {
    flags: Flags;
    init(flags: Flags): [State, Array<Effect<Action>>];
    update(action: Action, state: State): [State, Array<Effect<Action>>];
  }): Program<Action, State> {
    return new ClientProgram(init(flags), update);
  },
};
