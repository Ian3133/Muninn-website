function cleanTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function carrySourceTitle(currentTitle, incomingTitle) {
  return cleanTitle(currentTitle) || cleanTitle(incomingTitle);
}

export function sourceDocumentTitle(source, publisherLabels = []) {
  const rawTitle = cleanTitle(source?.title);
  const labels = publisherLabels
    .map(cleanTitle)
    .filter(Boolean);
  const strippedTitle = labels.reduce((title, publisher) => {
    const escaped = publisher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return title.replace(new RegExp(`\\s*(?:[-–—|:]\\s*)${escaped}\\s*$`, 'i'), '').trim();
  }, rawTitle);
  const repeatsPublisher = !strippedTitle
    || labels.some((publisher) => strippedTitle.toLowerCase() === publisher.toLowerCase());

  if (!repeatsPublisher) return strippedTitle;

  const url = String(source?.url || '');
  if (/travel-advisories/i.test(url)) return 'Travel advisory';
  if (/congress\.gov\/crs-product/i.test(url)) return 'Congressional Research Service brief';
  if (/current-wildfire-information/i.test(url)) return 'Current wildfire information';
  if (/seasonal-outlook/i.test(url)) return 'Seasonal wildfire outlook';
  if (/\.pdf(?:\?|$)/i.test(url)) return 'Fact sheet';
  return '';
}
