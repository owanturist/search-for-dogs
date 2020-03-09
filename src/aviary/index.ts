/* eslint-disable @typescript-eslint/no-use-before-define */

import Dict from 'frctl/Dict';
import Either, { Left } from 'frctl/Either';
import Decode from 'frctl/Json/Decode';
import Maybe, { Just, Nothing } from 'frctl/Maybe';
import Set from 'frctl/Set';

import { Effect } from '../core';

const DOG_API = 'https://dog.ceo/api';

/**
 * Stands as input value for Aviary.classify.
 * Represents output of MobileNet.classify.
 */
export interface Classification {
  className: string;
  probability: number;
}

/**
 * Stands for result of Aviary.classify call.
 */
export interface Probe {
  match: number;
  breed: string;
  subBreed: Maybe<string>;
}

/**
 * Creates decoder to handle common part of Dog Api responses.
 */
const dogApiDecoder = <Data>(
  decoder: Decode.Decoder<Data>,
): Decode.Decoder<Data> => {
  return Decode.field('status').string.chain(status => {
    switch (status) {
      case 'error':
        return Decode.field('message').string.chain(Decode.fail);

      case 'success':
        return Decode.field('message').of(decoder);

      default:
        return Decode.fail(`Unknown status "${status}"`);
    }
  });
};

const aviaryDecoder: Decode.Decoder<Aviary> = Decode.keyValue(
  Decode.list(Decode.string).map(Set.fromList),
).map(pairs => new Aviary(Dict.fromList(pairs)));

/**
 * Class to intelligent match MobileNet output to Dog Api possible breeds.
 */
export class Aviary {
  public constructor(private readonly breeds: Dict<string, Set<string>>) {}

  /**
   * Creates an Effect to call Dog Api for list of all breeds with sub-breeds.
   */
  public static init<Action>(
    tagger: (result: Either<string, Aviary>) => Action,
  ): Effect<Action> {
    return dispatch => {
      fetch(`${DOG_API}/breeds/list/all`)
        .then(response => response.text())
        .then(json => dogApiDecoder(aviaryDecoder).decodeJSON(json))
        .then(
          result =>
            dispatch(tagger(result.mapLeft(error => error.stringify(4)))),
          error => dispatch(tagger(Left(String(error)))),
        );
    };
  }

  /**
   * Sends a request to Dog Api based on Aviary.classify result.
   */
  public static search(breed: Probe): Promise<string[]> {
    const method = breed.subBreed.cata({
      Nothing: () => `breed/${breed.breed}/images`,

      Just: subBreed => `breed/${breed.breed}/${subBreed}/images`,
    });

    return fetch(`${DOG_API}/${method}`)
      .then(response => response.text())
      .then(json => dogApiDecoder(Decode.list(Decode.string)).decodeJSON(json))
      .then(result =>
        result.cata({
          Left: error => Promise.reject(error.stringify(4)),
          Right: pictures => Promise.resolve(pictures),
        }),
      );
  }

  /**
   * Tries to classify MobileNet output to existing Dog Api data.
   * In case there is not match goes back with Nothing.
   * Takes time proportional to `O(n)`.
   */
  public classify(classifications: Classification[]): Maybe<Probe> {
    return classifications
      .slice()
      .sort((left, right) => right.probability - left.probability)
      .reduce(
        (result, { probability, className }) =>
          result.orElse(() => this.classifySingle(probability, className)),
        Nothing,
      );
  }

  /**
   * Split each className to fragments and takes first match.
   */
  private classifySingle(match: number, className: string): Maybe<Probe> {
    return className
      .toLowerCase()
      .split(/,\s*/u)
      .reduce(
        (result, fragment) =>
          result.orElse(() => this.classifyFragment(match, fragment)),
        Nothing,
      );
  }

  /**
   * Split each fragment to potential breed and sub-breed names.
   * Takes first success match.
   * Takes time proportional to `O(n^2)` where `n` is a small value
   * so there is no reason to use Set here.
   */
  private classifyFragment(match: number, fragment: string): Maybe<Probe> {
    const names = fragment.split(/\s|-/u);

    return names
      .reduce(
        (result, breed) =>
          result.orElse(() =>
            this.breeds.get(breed).map(subBreeds => ({ breed, subBreeds })),
          ),
        Nothing,
      )
      .map(({ breed, subBreeds }) => ({
        match,
        breed,
        subBreed: names.reduce(
          (result, subBreed) =>
            result.orElse(() =>
              subBreeds.member(subBreed) ? Just(subBreed) : Nothing,
            ),
          Nothing,
        ),
      }));
  }
}
