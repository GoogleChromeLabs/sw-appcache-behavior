import {get, set} from 'idb-keyval';

async function wrappedGet(key: string): Promise<any> {
  return await get(key) || {};
}

export {
  set,
  wrappedGet as get,
};
