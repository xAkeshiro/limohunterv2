/**
 * Checks the Wikimedia Commons photo matcher against fixtures shaped like the
 * real API response, with fetch stubbed so no network is needed.
 */
import {
  clearPhotoCache, findPhotosForListing, parseCommons, plainText, queryPlan, withPhotos,
} from '../src/lib/photos';
import { isRepresentative, needsPhotos, type ListingView } from '../src/lib/types';

let pass = 0;
let fail = 0;
function t(name: string, cond: boolean, extra = '') {
  if (cond) { pass += 1; console.log(`  ok    ${name}`); }
  else { fail += 1; console.log(`  FAIL  ${name} ${extra}`); }
}

function file(index: number, title: string, over: Record<string, unknown> = {}) {
  const name = title.replace(/ /g, '_');
  return {
    index,
    title: `File:${title}`,
    imageinfo: [{
      thumburl: `https://upload.wikimedia.org/thumb/${encodeURIComponent(name)}/1280px.jpg`,
      url: `https://upload.wikimedia.org/${encodeURIComponent(name)}`,
      descriptionurl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name)}`,
      width: 1600, height: 1000, mime: 'image/jpeg',
      extmetadata: {
        Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Jane">Jane &amp; Co</a>' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
      },
      ...over,
    }],
  };
}

const fixture = (...pages: ReturnType<typeof file>[]) => ({
  query: { pages: Object.fromEntries(pages.map((p, i) => [String(1000 + i), p])) },
});

/** Stub fetch; each call hands back the next queued response and logs the query. */
const calls: string[] = [];
let queue: (object | 'error')[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  calls.push(new URL(String(input)).searchParams.get('gsrsearch') ?? '');
  const next = queue.shift() ?? { query: { pages: {} } };
  if (next === 'error') throw new Error('network down');
  return new Response(JSON.stringify(next), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

function reset(responses: (object | 'error')[]) {
  clearPhotoCache();
  calls.length = 0;
  queue = [...responses];
}

const listing = (over: Partial<ListingView>): ListingView => ({
  id: 1, slug: 's', title: 't', body_style: 'SUV', make: 'Cadillac', model: 'Escalade ESV', year: 2017,
  price: 1, mileage: 1, passengers: 6, condition: 'Used', fuel: 'Gasoline', transmission: 'Automatic',
  drivetrain: 'AWD', exterior_color: 'Black', interior_color: 'Black', vin: null, city: 'X', state: 'CA',
  description: '', features: [], images: ['/img/suv-1.svg'], image_credits: [], seller_id: null,
  seller_name: '', seller_phone: '', featured: 0, sold: 0, status: 'published', views: 0, created_at: '',
  ...over,
});

async function main() {
  console.log('\nparsing');
  const parsed = parseCommons(fixture(
    file(3, 'Cadillac Escalade third'),
    file(1, 'Cadillac Escalade first'),
    file(2, 'Cadillac Escalade portrait', { width: 900, height: 1400 }),
    file(4, 'Cadillac Escalade tiny', { width: 400, height: 250 }),
    file(5, 'Cadillac Escalade vector', { mime: 'image/svg+xml' }),
    file(6, 'Cadillac Escalade logo'),
    file(7, 'Cadillac Escalade 1-43 scale model'),
  ));
  t('orders by search rank', parsed[0]?.src.includes('first') === true && parsed[1]?.src.includes('third') === true);
  t('drops portrait, tiny, vector, logo and scale-model files', parsed.length === 2, `got ${parsed.length}`);
  t('uses the 1280px thumbnail', parsed[0]?.src.includes('1280px') === true);
  t('strips HTML from the author', parsed[0]?.author === 'Jane & Co', `got ${parsed[0]?.author}`);
  t('keeps license name and link', parsed[0]?.license === 'CC BY-SA 4.0' && parsed[0]?.licenseUrl !== null);
  t('keeps a link back to the file page', parsed[0]?.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:') === true);
  t('empty response is empty, not an error', parseCommons({}).length === 0);
  t('plainText truncates long credits', plainText('x'.repeat(200)).length <= 80);

  console.log('\nquery plan');
  const stretch = queryPlan({ make: 'Ford', model: 'F-550', body_style: 'Party Bus' }).map((q) => q.q);
  t('conversion never searches the bare base vehicle', !stretch.includes('Ford F-550'), JSON.stringify(stretch));
  t('conversion falls back to its vehicle class', stretch.at(-1) === 'party bus', JSON.stringify(stretch));
  const suv = queryPlan({ make: 'Cadillac', model: 'Escalade ESV', body_style: 'SUV' }).map((q) => q.q);
  t('base model tries make + model, then trimmed model', suv[0] === 'Cadillac Escalade ESV' && suv.includes('Cadillac Escalade'), JSON.stringify(suv));
  t('no duplicate queries', new Set(suv).size === suv.length);

  console.log('\nmatching');
  reset([fixture(file(1, 'Cadillac Escalade ESV black'), file(2, 'Lincoln Navigator'), file(3, 'Cadillac Escalade side'))]);
  let photos = await findPhotosForListing(listing({}));
  t('keeps only files naming the make or model', photos.length === 2 && photos.every((p) => /Cadillac/.test(p.sourceUrl)), `got ${photos.length}`);
  t('stops after the first productive query', calls.length === 1, `made ${calls.length} calls`);

  reset([fixture(), fixture(file(1, 'Cadillac Escalade 2016'))]);
  photos = await findPhotosForListing(listing({}));
  t('falls through to the next query when one is empty', photos.length === 1 && calls.length === 2, `calls ${calls.length}`);

  reset(['error']);
  photos = await findPhotosForListing(listing({}));
  t('network failure returns nothing instead of throwing', photos.length === 0);
  t('network failure stops the query plan early', calls.length === 1, `made ${calls.length} calls`);
  photos = await findPhotosForListing(listing({ model: 'Other' }));
  t('then cools off without hitting the network', calls.length === 1, `made ${calls.length} calls`);

  reset([fixture(file(1, 'Cadillac Escalade A'))]);
  await findPhotosForListing(listing({ id: 1 }));
  await findPhotosForListing(listing({ id: 2 }));
  t('same model is looked up once', calls.length === 1, `made ${calls.length} calls`);

  console.log('\nrender-time substitution');
  reset([fixture(file(1, 'Cadillac Escalade A'), file(2, 'Cadillac Escalade B'))]);
  const swapped = await withPhotos(listing({}));
  t('placeholder listing gets real photos', swapped.images.length === 2 && swapped.images.every((s) => s.startsWith('https://')));
  t('credits line up with the photos', swapped.image_credits.map((c) => c.src).join() === swapped.images.join());
  t('marked as representative', swapped.photos_auto === true);

  reset([fixture(file(1, 'Cadillac Escalade A'))]);
  const own = listing({ images: ['https://blob.example/own.jpg'] });
  const untouched = await withPhotos(own);
  t('listing with its own photos is left alone', untouched === own && calls.length === 0);

  reset([fixture()]);
  const none = await withPhotos(listing({}));
  t('no match keeps the drawn placeholder', none.images[0] === '/img/suv-1.svg' && !none.photos_auto);

  process.env.AUTO_PHOTOS = '0';
  reset([fixture(file(1, 'Cadillac Escalade A'))]);
  const off = await withPhotos(listing({}));
  t('AUTO_PHOTOS=0 disables lookups', off.images[0] === '/img/suv-1.svg' && calls.length === 0);
  delete process.env.AUTO_PHOTOS;

  t('needsPhotos: drawings only', needsPhotos({ images: ['/img/a.svg', '/img/b.svg'] }));
  t('needsPhotos: empty', needsPhotos({ images: [] }));
  t('needsPhotos: any real photo', !needsPhotos({ images: ['/img/a.svg', '/uploads/x.jpg'] }));

  const stored = listing({ images: ['https://u/a.jpg'], image_credits: [{ src: 'https://u/a.jpg', author: 'A', license: 'CC', licenseUrl: null, sourceUrl: 'https://c/F' }] });
  t('stored stock photos still count as representative', isRepresentative(stored));
  t('own uploads are not representative', !isRepresentative(listing({ images: ['/uploads/mine.jpg'] })));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
