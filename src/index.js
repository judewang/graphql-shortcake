import fp from 'lodash/fp';
import Model from './Model';
import withArrayMutator from './withArrayMutator';
import withBuilder from './withBuilder';
import withBatch from './withBatch';
import withCache from './withCache';
import withDefaultValues from './withDefaultValues';
import withFetcher from './withFetcher';
import withGlobalId from './withGlobalId';
import withHash from './withHash';
import withIncrementer from './withIncrementer';
import withJSONMutator from './withJSONMutator';
import withLoader from './withLoader';
import withMutator from './withMutator';
import withSearcher from './withSearcher';

export * from './columns';
export * from './GlobalId';
export { default as GlobalId } from './GlobalId';
export { default as DataCache } from './DataCache';
export { default as MixedModel } from './MixedModel';

export default fp.compose(
  withArrayMutator,
  withJSONMutator,
  withIncrementer,
  withSearcher,
  withDefaultValues,
  withCache,
  withLoader,
  withFetcher,
  withMutator,
  withBatch,
  withHash,
  withBuilder,
  withGlobalId,
)(Model);
