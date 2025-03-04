/**
 * Defines `Sub`s as streams of messages.
 *
 * @since 0.5.0
 */

import { EMPTY, Observable, merge } from 'rxjs'
import { map as RxMap } from 'rxjs/operators'

/**
 * @since 0.5.0
 */
export interface Sub<Msg> extends Observable<Msg> {}

/**
 * Maps `Msg` of a `Sub` into another `Msg`.
 * @since 0.5.0
 */
export function map<A, Msg>(f: (a: A) => Msg): (sub: Sub<A>) => Sub<Msg> {
  return sub => sub.pipe(RxMap(f))
}

/**
 * Merges subscriptions streams into one stream.
 * @since 0.5.0
 */
export function batch<Msg>(arr: Array<Sub<Msg>>): Sub<Msg> {
  return merge(...arr)
}

/**
 * A `none` subscription is an empty stream.
 * @since 0.5.0
 */
export const none: Sub<never> = EMPTY
