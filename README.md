# Search for Dogs | [Demo](http://bit.ly/search-for-dogs)

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br /> Open
[http://localhost:8080](http://localhost:8080) to view it in the browser.

The page will reload if you make edits.

### `npm run build`

Builds the app for production to the `build` folder.<br />

The build is minified and the filenames include the hashes.<br />

### `npm test`

Launches the test runner.<br />

## Features

- Pure css lighweight fast masonry grid.

## What is the wierd reducers?

This is the way how to create and use components without drilling of
handlers/properties and keep the state global at the same time.

If you are interested in the topic take a look at the
[slides](http://bit.ly/fractal-architecture) or/and contact me. I'll be glad to
explain my vision.

## Why classes?

Here is a piece of code which describes simple counter's `Action` and way of
handling them like `update`/`reducer`. Below the code you might find a lists of
pros and cons by my opinion. I didn't use `readonly` for keep the example more
clean.

```ts
/**
 * Common State.
 */
export interface State {
  count: number;
}

/* REDUX WAY */

/**
 * Action definition.
 *
 * Everyone outside knows about signature of your Action
 * and might use it and violates encapsulation.
 */
export type Action =
  | { type: Decrement; amount: number }
  | { type: Increment; amount: number }
  | { type: Reset };

/**
 * Action.type definition.
 *
 * Used in Action definition and Action.type shortcut.
 * Not required.
 */
type Decrement = '@Counter/Decrement';

/**
 * Action.type shortcut.
 *
 * Used in Action shortcut and reducer.
 * Not required.
 */
const Decrement: Decrement = '@Counter/Decrement';

/**
 * Action shortcut.
 *
 * Used like constructor of Action wherever and whenever you need.
 * Not required.
 */
const decrement = (amount: number): Action => ({ type: Decrement, amount });

type Increment = '@Counter/Increment';
const Increment: Increment = '@Counter/Increment';
const increment = (amount: number): Action => ({ type: Increment, amount });

type Reset = '@Counter/Reset';
const Reset: Reset = '@Counter/Reset';
const reset: Action = { type: Reset };

/**
 * Handler of Action (reducer).
 *
 * Handles a whole bunch of Action.
 * This function always uses all cases of Action, so you should keep in mind
 * which of them are really used and which are legacy and should be removed.
 * Tree shaking keeps the code in place.
 */
export const update = (state: State, action: Action): State => {
  switch (action.type) {
    case Decrement: {
      return { ...state, count: state.count + action.amount };
    }

    case Increment: {
      return { ...state, count: state.count + action.amount };
    }

    case Reset: {
      return { ...state, count: 0 };
    }

    default: {
      return state;
    }
  }
};

/* CLASS WAY */

/**
 * Action interface.
 *
 * Nobody outisde knows about signature of your Action. Even inside the module.
 */
export interface Action {
  /**
   * Handler of Action.
   *
   * Handles just the Action and nothing else.
   */
  update(state: State): State;
}

class Increment implements Action {
  constructor(private amount: number) {}

  public update(state: State): State {
    return { ...state, count: state.count + this.amount };
  }
}

class Decrement implements Action {
  constructor(private amount: number) {}

  public update(state: State): State {
    return { ...state, count: state.count - this.amount };
  }
}

class Reset implements Action {
  public update(state: State): State {
    return { ...state, count: 0 };
  }
}
```

### Advantages

1. Encapsulation. No one parent module know anything about `Action`, it can just
   call `update`. It prevents modifying and reading of a `Action` from parent
   module.
1. No more huge `reducer` function - whole logic is described inside the source.
   It's very natural to define a `Action` and describe handling right there.
1. Easy track of unused `Action`. Otherwise you use described `type Action` at
   least in one place: `reducer`. Even if you use only one of let's say ten
   `Action` in a module the `reducer` will always use all of them.
1. More easy refactoring. Everything (definition, handling, helpers as static
   methods) in a single place and if you've decided to get rid of one of the
   `Action` you just delete it. Otherwise you should delete it at least from two
   places: type definition and `reducer`.

### Disadvantages

1. You should implement `update` method in every `Action`, so it looks like kind
   of boilerplate. Otherwise you have single place (`reducer`) which describes
   the signature.
1. Creating of `Action` with `new` looks unusual and not natural.
1. Everyone does like Redux, nobody likes classes.
