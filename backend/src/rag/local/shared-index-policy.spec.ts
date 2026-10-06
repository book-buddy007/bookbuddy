import { sharedIndexBlocker } from './shared-index-policy';

describe('sharedIndexBlocker', () => {
  it('lets a global, AI-licensed book into the shared index', () => {
    expect(sharedIndexBlocker({ title: 'Economics', catalogScope: 'GLOBAL', licenseType: 'AI_PERMITTED' })).toBeNull();
  });

  it('refuses an institutional book, whatever its licence, and says where to index it instead', () => {
    const why = sharedIndexBlocker({ title: 'Staff Handbook', catalogScope: 'INSTITUTIONAL', licenseType: 'AI_PERMITTED' });
    expect(why).toMatch(/"Staff Handbook" belongs to an institution/);
    expect(why).toMatch(/INGESTION_MODE=local/);
  });

  it.each(['UNKNOWN', 'AI_RESTRICTED', null, undefined])('refuses a global book whose licence is %s', (licenseType) => {
    expect(sharedIndexBlocker({ catalogScope: 'GLOBAL', licenseType })).toMatch(/not licensed for AI use/);
  });

  it('fails closed when the scope is missing or unrecognised', () => {
    expect(sharedIndexBlocker({ licenseType: 'AI_PERMITTED' })).not.toBeNull();
    expect(sharedIndexBlocker({ catalogScope: 'global', licenseType: 'AI_PERMITTED' })).not.toBeNull();
  });
});
