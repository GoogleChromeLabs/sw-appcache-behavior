export function longestMatchingPrefix(
  urlPrefixes: Array<string>,
  fullUrl: string
) {
  return urlPrefixes
    .filter((urlPrefix) => fullUrl.startsWith(urlPrefix))
    .reduce((longestSoFar, current) => {
      return longestSoFar.length >= current.length ? longestSoFar : current;
    }, '');
}
