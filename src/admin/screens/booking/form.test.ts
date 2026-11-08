import { describe, expect, it } from 'vitest';
import { enquiryConversion } from '../../model';
import { booking, clients, dmcPay, enquiry, line } from '../../model/testFixtures';
import {
  addService,
  blankForm,
  blankLine,
  canSetCategory,
  formFromBooking,
  isValid,
  liveMoneyInput,
  sectionErrors,
  sectionPatch,
  setCategory,
  setTravel,
  toCreateArgs,
  untagWarning,
  visibleSections,
  SECTION_KEYS,
  SECTION_TITLES,
} from './form';

describe('category selection', () => {
  it('picking a single Category creates its one line; adding a service makes a Package', () => {
    let f = setCategory(blankForm(), 'Visa');
    expect(f.lines.map((l) => l.type)).toEqual(['Visa']);
    f = addService(f);
    expect(f.category).toBe('Package');
    expect(f.lines.map((l) => l.type)).toEqual(['Visa', 'Hotel']);
  });

  it('Package with 2 lines cannot switch to a single Category; 1 line can and is retyped', () => {
    const two = addService(setCategory(blankForm(), 'Hotel'));
    expect(canSetCategory(two, 'Bus')).toBe(false);
    expect(setCategory(two, 'Bus')).toBe(two);
    const one = { ...two, lines: two.lines.slice(0, 1) };
    expect(setCategory(one, 'Bus')).toMatchObject({ category: 'Bus', tripScope: undefined, lines: [{ type: 'Bus' }] });
  });

  it('from none: Package gets a Hotel line, no dmcId', () => {
    const f = setCategory(blankForm(), 'Package');
    expect(f.lines).toHaveLength(1);
    expect(f.lines[0]).toMatchObject({ type: 'Hotel' });
    expect(f.lines[0]).not.toHaveProperty('dmcId');
    expect(blankLine('Bus')).toMatchObject({ type: 'Bus', description: '', netCost: 0 });
  });

  it('single → single retypes line 0, keeping its data and dropping Visa fields', () => {
    const visa = setCategory(blankForm(), 'Visa');
    const withData = { ...visa, lines: [{ ...visa.lines[0], description: 'UAE', visaType: 'Visitor' as const, visaCountry: 'UAE' }] };
    const hotel = setCategory(withData, 'Hotel');
    expect(hotel.lines).toHaveLength(1);
    expect(hotel.lines[0]).toMatchObject({ id: visa.lines[0].id, type: 'Hotel', description: 'UAE' });
    expect(hotel.lines[0]).not.toHaveProperty('visaType');
    expect(hotel.lines[0]).not.toHaveProperty('visaCountry');
    expect(setCategory(hotel, 'Visa').lines[0].type).toBe('Visa');
    expect(setCategory(withData, 'Visa').lines[0]).toMatchObject({ visaType: 'Visitor', visaCountry: 'UAE' });
  });

  it('single → Package keeps the line; leaving Package clears Trip Scope', () => {
    const hotel = setCategory(blankForm(), 'Hotel');
    const pkg = setCategory(hotel, 'Package');
    expect(pkg.lines).toEqual(hotel.lines);
    const scoped = { ...pkg, tripScope: 'Domestic' as const };
    expect(setCategory(scoped, 'Flight').tripScope).toBeUndefined();
    expect(setCategory(scoped, 'Package').tripScope).toBe('Domestic');
  });
});

describe('sections', () => {
  it('has the Service/Travellers sections in order with titles', () => {
    expect(SECTION_KEYS).toEqual(['client', 'service', 'travel', 'travellers', 'price', 'notes']);
    expect(SECTION_TITLES).toEqual({
      client: 'Customer',
      service: 'Service',
      travel: 'Travel',
      travellers: 'Travellers',
      price: 'Price',
      notes: 'Notes',
    });
  });

  it('Travellers on every Category; Travel hidden for Visa/Passport', () => {
    const passport = visibleSections(setCategory(blankForm(), 'Passport'));
    expect(passport).toContain('travellers');
    expect(passport).not.toContain('travel');
    expect(visibleSections(setCategory(blankForm(), 'Hotel'))).toEqual(['client', 'service', 'travel', 'travellers', 'price', 'notes']);
    expect(visibleSections(blankForm())).toContain('travellers');
  });
});

describe('travel', () => {
  it('setTravel toggles hasTravel', () => {
    expect(setTravel(blankForm(), true).hasTravel).toBe(true);
    expect(setTravel(blankForm({ start: '2026-12-01' }), false).hasTravel).toBe(false);
  });

  it('removing Travel clears its fields in the patch', () => {
    const f = { ...setCategory(blankForm({ start: '2026-12-01' }), 'Hotel'), destination: 'Goa', hasTravel: false };
    expect(sectionPatch('travel', f)).toMatchObject({ hasTravel: false, destination: '', travelStart: undefined, travelEnd: undefined, itinerary: '' });
  });

  it('travel patch never carries pax/names (they belong to Travellers)', () => {
    const hotel = setCategory(blankForm({ start: '2026-12-01' }), 'Hotel');
    expect(sectionPatch('travel', hotel)).not.toHaveProperty('pax');
    expect(sectionPatch('travel', hotel)).not.toHaveProperty('travellerNames');
  });

  it('picking Visa/Passport turns Travel off; the Service save clears travel details', () => {
    const hotel = { ...setCategory(blankForm({ start: '2026-12-01' }), 'Hotel'), destination: 'Goa' };
    expect(hotel.hasTravel).toBe(true);
    const passport = setCategory(hotel, 'Passport');
    expect(passport.hasTravel).toBe(false);
    expect(sectionPatch('service', passport)).toMatchObject({ hasTravel: false, destination: '', travelStart: undefined, travelEnd: undefined, itinerary: '' });
    expect(sectionPatch('service', hotel)).not.toHaveProperty('hasTravel');
  });

  it('no travel errors while Travel is off', () => {
    const f = setCategory(blankForm(), 'Hotel');
    expect(sectionErrors('travel', f, clients).fields).toEqual({});
    expect(Object.keys(sectionErrors('travel', setTravel(f, true), clients).fields)).toEqual(
      ['destination', 'travelStart'],
    );
  });
});

describe('service section', () => {
  it('errors cover category, tripScope, lines and per-line errors', () => {
    const none = sectionErrors('service', blankForm(), clients);
    expect(none.fields.category).toBeTruthy();
    const pkg = setCategory(blankForm(), 'Package');
    const e = sectionErrors('service', pkg, clients);
    expect(e.fields.tripScope).toBeTruthy();
    expect(e.fields.lines).toBeTruthy();
    expect(e.lines[pkg.lines[0].id]).toMatchObject({ description: expect.any(String) });
    expect(Object.keys(e.fields)).not.toContain('sellingPrice');
  });

  it('Service save on a Visa form needs no travellers', () => {
    const hotel = setCategory(blankForm(), 'Hotel');
    const visa = { ...setCategory(hotel, 'Visa'), lines: [{ ...blankLine('Visa'), description: 'UAE visa', visaType: 'Visitor' as const, visaCountry: 'UAE' }] };
    expect(isValid(sectionErrors('service', { ...visa, pax: { adults: 0, children: 0, infants: 0 } }, clients))).toBe(true);
  });

  it('a line without a DMC drops its stale Pay DMC by', () => {
    const f = { ...setCategory(blankForm(), 'Hotel') };
    const patch = (dmcId?: string) => sectionPatch('service', { ...f, lines: [{ ...f.lines[0], description: 'x', dmcId, dmcPayBy: '2026-12-01' }] }).lines![0];
    expect(patch('d1').dmcPayBy).toBe('2026-12-01');
    expect(patch(undefined).dmcPayBy).toBeUndefined();
    expect(patch('').dmcPayBy).toBeUndefined();
  });

  it('patch: tripScope only for Package, empty dmcId → undefined, Visa fields only on Visa lines', () => {
    const pkg = { ...setCategory(blankForm(), 'Package'), tripScope: 'Domestic' as const };
    const withLines = {
      ...pkg,
      lines: [
        { ...pkg.lines[0], description: ' Stay ', dmcId: '' },
        { ...blankLine('Visa'), description: 'Visa', dmcId: 'd1', visaType: 'Business' as const, visaCountry: 'UAE' },
        { ...blankLine('Bus'), description: 'Bus', visaType: 'Business' as const, visaCountry: 'UAE' },
      ],
    };
    const patch = sectionPatch('service', withLines);
    expect(patch).toMatchObject({ category: 'Package', tripScope: 'Domestic' });
    const [a, b, c] = patch.lines!;
    expect(a.description).toBe('Stay');
    expect(a.dmcId).toBeUndefined();
    expect(b).toMatchObject({ dmcId: 'd1', visaType: 'Business', visaCountry: 'UAE' });
    expect(c.visaType).toBeUndefined();
    expect(c.visaCountry).toBeUndefined();

    const single = sectionPatch('service', { ...setCategory(blankForm(), 'Hotel'), tripScope: 'Domestic' });
    expect(single.tripScope).toBeUndefined();
  });
});

describe('travellers section', () => {
  it('all optional (zero travellers, no names); only whole-number counts', () => {
    const f = { ...setCategory(blankForm(), 'Hotel'), pax: { adults: 0, children: 0, infants: 0 } };
    expect(sectionErrors('travellers', f, clients).fields).toEqual({});
    expect(sectionErrors('travellers', { ...f, pax: { adults: 1.5, children: 0, infants: 0 } }, clients).fields).toHaveProperty('pax');
    expect(sectionPatch('travellers', f)).toEqual({ pax: f.pax, travellerNames: [] });
  });
});

describe('money, create, warnings', () => {
  it('liveMoneyInput reads the service section', () => {
    const b = booking({ sellingPrice: 100, lines: [line({ netCost: 10 })] });
    const f = { ...formFromBooking(b), lines: [line({ netCost: 50 })] };
    expect(liveMoneyInput(b, f, new Set(['service'])).lines).toEqual(f.lines);
    expect(liveMoneyInput(b, f, new Set()).lines).toEqual(b.lines);
  });

  it('toCreateArgs passes category, tripScope and hasTravel', () => {
    const f = { ...setCategory(blankForm({ start: '2026-12-01' }), 'Package'), tripScope: 'International' as const, destination: ' Dubai ' };
    const { draft } = toCreateArgs(f);
    expect(draft).toMatchObject({ category: 'Package', tripScope: 'International', hasTravel: true, destination: 'Dubai' });
    expect(draft.lines).toHaveLength(1);
    const off = toCreateArgs(setCategory(blankForm(), 'Visa')).draft;
    expect(off).toMatchObject({ category: 'Visa', hasTravel: false, destination: '', travelStart: '', travelEnd: '' });
  });

  it('untagWarning counts DMC payments losing their tag', () => {
    const l1 = line({ id: 'x1', dmcId: 'd1' });
    const b = booking({ lines: [l1], dmcPayments: [dmcPay('d1', 100, { lineId: 'x1' }), dmcPay('d1', 50, { lineId: 'x1' })] });
    const f = formFromBooking(b);
    expect(untagWarning(b, f)).toBeNull();
    expect(untagWarning(b, { ...f, lines: [{ ...l1, dmcId: 'd2' }] })).toBe(
      '2 DMC payments tagged to a changed service will stay with the old DMC, untagged.',
    );
    const one = booking({ lines: [l1], dmcPayments: [dmcPay('d1', 100, { lineId: 'x1' })] });
    expect(untagWarning(one, { ...f, lines: [] })).toBe('1 DMC payment tagged to a changed service will stay with the old DMC, untagged.');
  });
});

describe('blankForm and conversion', () => {
  it('defaults: no category, one adult, travel only with ?start=', () => {
    const f = blankForm();
    expect(f).toMatchObject({ category: '', hasTravel: false, pax: { adults: 1, children: 0, infants: 0 }, lines: [] });
    expect(blankForm({ start: '2026-12-01' })).toMatchObject({ hasTravel: true, travelStart: '2026-12-01' });
  });

  it('enquiry conversion presets the Category', () => {
    const c = enquiryConversion(enquiry({ service: 'passport-services' }), clients);
    expect(blankForm({ conversion: c }).category).toBe('Passport');
    expect(blankForm({ conversion: c }).lines.map((l) => l.type)).toEqual(['Passport']);
    expect(c.draft).not.toHaveProperty('lines');
    const none = enquiryConversion(enquiry({ service: 'something-else' }), clients);
    expect(none.category).toBeUndefined();
    expect(blankForm({ conversion: none }).category).toBe('');
  });

  it('a converted Enquiry with a destination starts with Travel on and keeps it in the travel patch', () => {
    const f = blankForm({ conversion: enquiryConversion(enquiry({ service: 'hotel-booking', destination: 'Dubai' }), clients) });
    expect(f).toMatchObject({ category: 'Hotel', hasTravel: true, destination: 'Dubai' });
    expect(sectionPatch('travel', f)).toMatchObject({ hasTravel: true, destination: 'Dubai' });
    expect(blankForm({ conversion: enquiryConversion(enquiry({ service: 'hotel-booking', destination: ' ' }), clients) }).hasTravel).toBe(false);
  });

  it('a converted Visa Enquiry has no Travel; its destination becomes the Visa Country', () => {
    const f = blankForm({ conversion: enquiryConversion(enquiry({ destination: 'Dubai' }), clients) });
    expect(f).toMatchObject({ category: 'Visa', hasTravel: false });
    expect(f.lines[0].visaCountry).toBe('Dubai');
  });
});
