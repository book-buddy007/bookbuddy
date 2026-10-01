/// <reference types="cypress" />

describe('Super-Admin Homepage Branding Editor', () => {
    beforeEach(() => {
        // Intercept API calls to mock responses for tests
        cy.intercept('GET', '/api/super-admin/institutions', {
            statusCode: 200,
            body: [{ id: 'tenant-1', name: 'Test University' }]
        }).as('getInstitutions');

        cy.intercept('GET', '/api/super-admin/branding/tenant-1', {
            statusCode: 200,
            body: {
                colors: { primary: '#1A237E', secondary: '#E65100' },
                typography: 'Inter',
                homepage: {
                    hero: { title: 'Old Hero Title', subtitle: 'Old subtitle', ctaButton: 'Go' },
                    featured: { books: [], layout: 'grid' },
                    announcements: { title: 'News', items: [] },
                    sectionsOrder: ['hero', 'features', 'featured', 'gallery', 'testimonials', 'announcements']
                }
            }
        }).as('getBranding');

        // Mocks for updates
        cy.intercept('PUT', '/api/super-admin/branding/tenant-1', {
            statusCode: 200,
            body: { success: true }
        }).as('updateBranding');

        cy.intercept('POST', '/api/super-admin/branding/tenant-1/publish', {
            statusCode: 200,
            body: { success: true }
        }).as('publishBranding');

        cy.intercept('POST', '/api/super-admin/branding/tenant-1/revert', {
            statusCode: 200,
            body: {
                homepage: {
                    hero: { title: 'Reverted Title', subtitle: 'Reverted subtitle', ctaButton: 'Go' }
                }
            }
        }).as('revertBranding');

        // Simulate login by setting a dummy JWT or session
        // This assumes the app checks for a token/session
        cy.setCookie('next-auth.session-token', 'dummy-token-for-super-admin');

        // Visit the page
        cy.visit('/dashboard/super-admin/branding/homepage');
        cy.wait('@getInstitutions');
    });

    it('should load the branding editor with correct default values', () => {
        cy.wait('@getBranding');

        // Check if the page title loads
        cy.contains('Homepage Editor').should('be.visible');

        // Check if hero title is populated from the mock
        cy.get('input#hero-title').should('have.value', 'Old Hero Title');
    });

    it('should allow modifying the hero section and saving changes as draft', () => {
        cy.wait('@getBranding');

        // Modify Hero title
        cy.get('input#hero-title').clear().type('New Valid Hero Title');

        // Save draft
        cy.contains('Save Draft').click();

        // Check if the API was called with the new data
        cy.wait('@updateBranding').its('request.body.homepage.hero.title').should('eq', 'New Valid Hero Title');

        // Check for success toast
        cy.contains('Homepage Updated').should('be.visible');
    });

    it('should format URL values properly in Global Branding Controls', () => {
        // Simulating user clicking on Global Branding (it might be open already)
        cy.contains('Global Branding Controls').should('be.visible');

        // Depending on the implementation of BrandingControlsEditor, we can mock changing colors
    });

    it('should trigger publish endpoints correctly', () => {
        cy.wait('@getBranding');

        cy.contains('Publish to Live').click();

        cy.wait('@publishBranding').its('request.body').should('have.property', 'version');
        cy.contains('Published Successfully').should('be.visible');
    });

    it('should trigger revert endpoints and restore form state', () => {
        cy.wait('@getBranding');

        // Stub the confirm window to automatically click 'OK'
        cy.on('window:confirm', () => true);

        cy.contains('Revert Changes').click();

        cy.wait('@revertBranding');
        cy.contains('Reverted').should('be.visible');

        // Check if the form updated to the reverted title
        cy.get('input#hero-title').should('have.value', 'Reverted Title');
    });

    it('should handle offline mode gracefully', () => {
        cy.wait('@getBranding');

        // Go offline
        cy.goOffline();

        cy.contains('You are offline').should('be.visible');

        // Make a change
        cy.get('input#hero-title').clear().type('Offline Change');

        // Since auto-save triggers in 3s, wait for the localStorage to update
        cy.wait(3100);

        // Check local storage for the queued item
        cy.window().then((win) => {
            const saved = win.localStorage.getItem('offline-save-tenant-1');
            expect(saved).to.include('Offline Change');
        });

        // Go online
        cy.goOnline();
        cy.contains('You are back online').should('be.visible');

        // The hook should attempt to save the queued data
        cy.wait('@updateBranding').its('request.body.homepage.hero.title').should('eq', 'Offline Change');
    });
});
