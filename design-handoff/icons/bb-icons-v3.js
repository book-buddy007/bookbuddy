// Book Buddy icons v3 — modern line set. 24 grid, 1.5 stroke, round caps/joins, 2.5–3px corner radii.
// <bb-ico name="library" size="24" tone="line|soft|active|onfill" hue="a|b"></bb-ico>
// line   = stroke only (currentColor)          soft  = stroke + 16% accent fill on the key shape
// active = accent stroke + 14% accent fill      onfill = white glyph for use on a glossy accent chip
// Colours: --ic-accent (default blaze #FF4D00), --ic-accent-b (AI hue, default cobalt #3B5BDB).
(function () {
  if (customElements.get('bb-ico')) return;
  const gear = (() => {
    const R = 9.4, r = 7.3, pts = [];
    for (let k = 0; k < 8; k++) {
      const t = k * 45 - 90;
      [[r, t - 17], [R, t - 9], [R, t + 9], [r, t + 17]].forEach(([rad, a]) => {
        const q = a * Math.PI / 180; pts.push((12 + rad * Math.cos(q)).toFixed(2) + ' ' + (12 + rad * Math.sin(q)).toFixed(2));
      });
    }
    return 'M' + pts.join('L') + 'Z';
  })();
  const msg = 'M4 6.5A3 3 0 0 1 7 3.5h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-5.5l-4.5 4v-4H7a3 3 0 0 1-3-3z';
  // [stroke, softAccent, solidAccent]
  const I = {
    dashboard: ['<rect x="3" y="3" width="7.5" height="9" rx="2.2"/><rect x="13.5" y="3" width="7.5" height="5" rx="2.2"/><rect x="13.5" y="12" width="7.5" height="9" rx="2.2"/><rect x="3" y="16" width="7.5" height="5" rx="2.2"/>', '<rect x="3" y="3" width="7.5" height="9" rx="2.2"/><rect x="13.5" y="12" width="7.5" height="9" rx="2.2"/>'],
    library: ['<rect x="3" y="3.5" width="4" height="16.5" rx="1.4"/><rect x="8.5" y="3.5" width="4" height="16.5" rx="1.4"/><rect x="14.6" y="4" width="4" height="15.5" rx="1.4" transform="rotate(-14 16.6 11.75)"/>', '<rect x="8.5" y="3.5" width="4" height="16.5" rx="1.4"/>'],
    book: ['<path d="M5 18.5V5a3 3 0 0 1 3-3h11v15H7.5a2.5 2.5 0 0 0 0 5H19"/><path d="M10 2v7l2-1.5L14 9V2"/>', '<path d="M5 18.5V5a3 3 0 0 1 3-3h11v15H7.5A2.5 2.5 0 0 0 5 18.5z"/>', '<path d="M10 2v7l2-1.5L14 9V2z"/>'],
    'book-open': ['<path d="M12 7v14"/><path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H9a3 3 0 0 1 3 3 3 3 0 0 1 3-3h4.5A1.5 1.5 0 0 1 21 5.5v11a1.5 1.5 0 0 1-1.5 1.5H15a3 3 0 0 0-3 3 3 3 0 0 0-3-3H4.5A1.5 1.5 0 0 1 3 16.5z"/>', '<path d="M12 7a3 3 0 0 1 3-3h4.5A1.5 1.5 0 0 1 21 5.5v11a1.5 1.5 0 0 1-1.5 1.5H15a3 3 0 0 0-3 3z"/>'],
    annotate: ['<path d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="m13.5 6.5 3 3"/><path d="M12.5 20.5h8"/>', '<path d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>'],
    highlighter: ['<path d="m9 11-5 5v4.5h4.5l5-5"/><path d="m9 11 7.5-7.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L13.5 15.5z"/>', '', '<path d="M4 16v4.5h4.5z"/>'],
    sparkles: ['<path d="M11 4l1.6 4.4a2 2 0 0 0 1.2 1.2L18.2 11l-4.4 1.6a2 2 0 0 0-1.2 1.2L11 18.2l-1.6-4.4a2 2 0 0 0-1.2-1.2L3.8 11l4.4-1.4a2 2 0 0 0 1.2-1.2z"/><path d="M19 2.5v4M17 4.5h4M18.5 17.5v3M17 19h3"/>', '<path d="M11 4l1.6 4.4a2 2 0 0 0 1.2 1.2L18.2 11l-4.4 1.6a2 2 0 0 0-1.2 1.2L11 18.2l-1.6-4.4a2 2 0 0 0-1.2-1.2L3.8 11l4.4-1.4a2 2 0 0 0 1.2-1.2z"/>', '', 'b'],
    brain: ['<path d="M12 5a3 3 0 0 0-5.6-1.5A3 3 0 0 0 4 8.5a3 3 0 0 0-.5 5A3.5 3.5 0 0 0 7 19a3 3 0 0 0 5 1.5z"/><path d="M12 5a3 3 0 0 1 5.6-1.5A3 3 0 0 1 20 8.5a3 3 0 0 1 .5 5A3.5 3.5 0 0 1 17 19a3 3 0 0 1-5 1.5"/><path d="M12 5v15.5M8.3 9.3a2.6 2.6 0 0 1 2.2 1.2M15.7 9.3a2.6 2.6 0 0 0-2.2 1.2M7.6 14.4a2.2 2.2 0 0 0 2.6 1M16.4 14.4a2.2 2.2 0 0 1-2.6 1"/>', '<path d="M12 5a3 3 0 0 1 5.6-1.5A3 3 0 0 1 20 8.5a3 3 0 0 1 .5 5A3.5 3.5 0 0 1 17 19a3 3 0 0 1-5 1.5z"/>', '', 'b'],
    headphones: ['<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>', '<path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>'],
    settings: [`<path d="${gear}"/><circle cx="12" cy="12" r="3"/>`, '<circle cx="12" cy="12" r="3"/>'],
    varta: [`<path d="${msg}"/>`, `<path d="${msg}"/>`, '<path d="M12 6.4l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/>', 'b'],
    chat: [`<path d="${msg}"/><path d="M8.5 8.5h7M8.5 11.5h4.5"/>`, `<path d="${msg}"/>`],
    home: ['<path d="M3.5 10.2 12 3.5l8.5 6.7"/><path d="M5.5 8.8V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V8.8"/><path d="M10 20.5v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>', '<path d="M5.5 8.8 12 3.8l6.5 5V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19z"/>'],
    search: ['<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/>', '<circle cx="11" cy="11" r="7"/>'],
    bell: ['<path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9"/><path d="M10.3 20.5a1.9 1.9 0 0 0 3.4 0"/>', '<path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9z"/>'],
    user: ['<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>', '<circle cx="12" cy="8" r="4"/>'],
    users: ['<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>', '<circle cx="9" cy="8" r="3.5"/>'],
    student: ['<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11"/><path d="M21.5 9v5.5"/>', '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/>'],
    institution: ['<path d="M3 21h18"/><path d="M5 21V8.5L12 4l7 4.5V21"/><path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"/><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01"/>', '<rect x="9" y="16" width="6" height="5" rx="1"/>'],
    analytics: ['<path d="M3.5 3.5v15a2 2 0 0 0 2 2h15"/><rect x="7.5" y="11" width="3" height="6" rx="1"/><rect x="12.5" y="7" width="3" height="10" rx="1"/><rect x="17.5" y="4" width="3" height="13" rx="1"/>', '<rect x="12.5" y="7" width="3" height="10" rx="1"/>'],
    trending: ['<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'],
    heatmap: ['<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17"/>', '<rect x="9.2" y="9.2" width="5.6" height="5.6"/><path d="M14.8 3.5h2.7a3 3 0 0 1 3 3v2.7h-5.7z"/>'],
    calendar: ['<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14.5h.01M12 14.5h.01M16 14.5h.01"/>', '<path d="M3.5 8a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v2h-17z"/>'],
    clock: ['<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', '<circle cx="12" cy="12" r="9"/>'],
    bookmark: ['<path d="M6.5 5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16l-5.5-3.5L6.5 21z"/>', '<path d="M6.5 5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16l-5.5-3.5L6.5 21z"/>'],
    note: ['<path d="M5 3.5h14A1.5 1.5 0 0 1 20.5 5v9.5l-6 6H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M20.5 14.5H16a1.5 1.5 0 0 0-1.5 1.5v4.5M7.5 8.5h9M7.5 12h5"/>', '<path d="M20.5 14.5H16a1.5 1.5 0 0 0-1.5 1.5v4.5z"/>'],
    flashcards: ['<rect x="2.5" y="7" width="14" height="13.5" rx="2.5"/><path d="M7 7V5.5A2.5 2.5 0 0 1 9.5 3H19a2.5 2.5 0 0 1 2.5 2.5V15a2.5 2.5 0 0 1-2.5 2.5h-2.5M6 12h7M6 15.5h4.5"/>', '<rect x="2.5" y="7" width="14" height="13.5" rx="2.5"/>'],
    quote: ['<path d="M4.5 11.5c0-4 2-6.5 5-7M4.5 11.5H8a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 8 18.5H6A1.5 1.5 0 0 1 4.5 17zM14.5 11.5c0-4 2-6.5 5-7M14.5 11.5H18a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5z"/>', '<path d="M4.5 11.5H8a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 8 18.5H6A1.5 1.5 0 0 1 4.5 17zM14.5 11.5H18a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5z"/>'],
    lightbulb: ['<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.3 1 2.1v.3h6v-.3c0-.8.3-1.5 1-2.1A6.5 6.5 0 0 0 12 2.5z"/>', '<path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.3 1 2.1v.3h6v-.3c0-.8.3-1.5 1-2.1A6.5 6.5 0 0 0 12 2.5z"/>', '', 'b'],
    mic: ['<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4"/>', '<rect x="9" y="2.5" width="6" height="12" rx="3"/>'],
    target: ['<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/>', '<circle cx="12" cy="12" r="5.5"/>', '<circle cx="12" cy="12" r="2"/>'],
    flame: ['<path d="M12 21.5c-3.9 0-7-2.8-7-6.8 0-3.6 2.5-5.5 3.8-8 .6 1.8 1.6 2.8 2.7 3.2.4-2.7 1.7-5.2 3.7-7.4.4 3.4 3.8 6.1 3.8 10.6 0 4.6-3.1 8.4-7 8.4z"/>', '', '<path d="M12 21.5a3 3 0 0 1-3-3c0-1.8 1.5-2.8 3-4.8 1.5 2 3 3 3 4.8a3 3 0 0 1-3 3z"/>'],
    trophy: ['<path d="M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H5a2 2 0 0 0 0 4h2.7M16.5 6H19a2 2 0 0 1 0 4h-2.7M12 14v3.5M8.5 20.5h7M9.5 20.5c0-1.7 1-3 2.5-3s2.5 1.3 2.5 3"/>', '<path d="M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0z"/>'],
    assignment: ['<rect x="5" y="4.5" width="14" height="17" rx="2.5"/><rect x="9" y="2.5" width="6" height="4" rx="1.5"/><path d="m9 13.5 2 2 4-4"/>', '<rect x="9" y="2.5" width="6" height="4" rx="1.5"/>'],
    layers: ['<path d="M12 2.5 21 7.5l-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16.5l9 5 9-5"/>', '<path d="M12 2.5 21 7.5l-9 5-9-5z"/>'],
    file: ['<path d="M14 3H7a2.5 2.5 0 0 0-2.5 2.5v13A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V8.5z"/><path d="M14 3v4a1.5 1.5 0 0 0 1.5 1.5h4M8.5 13h7M8.5 16.5h4.5"/>', '<path d="M14 3v4a1.5 1.5 0 0 0 1.5 1.5h4z"/>'],
    folder: ['<path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h3.2a2 2 0 0 1 1.6.8L12 7h6a2.5 2.5 0 0 1 2.5 2.5V17a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17z"/>', '<path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h3.2a2 2 0 0 1 1.6.8L12 7h6a2.5 2.5 0 0 1 2.5 2.5V17a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17z"/>'],
    image: ['<rect x="3" y="3.5" width="18" height="17" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.3-4.3a1.5 1.5 0 0 0-2.1 0L5 20.3"/>', '<circle cx="9" cy="9" r="1.8"/>'],
    upload: ['<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M3.5 15v3A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5v-3"/>'],
    download: ['<path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5"/><path d="M3.5 15v3A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5v-3"/>'],
    scan: ['<path d="M3.5 8V6A2.5 2.5 0 0 1 6 3.5h2M16 3.5h2A2.5 2.5 0 0 1 20.5 6v2M20.5 16v2a2.5 2.5 0 0 1-2.5 2.5h-2M8 20.5H6A2.5 2.5 0 0 1 3.5 18v-2M7 12h10"/>', '<rect x="7" y="7" width="10" height="10" rx="1.5"/>'],
    sliders: ['<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>', '<circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'],
    database: ['<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>', '<ellipse cx="12" cy="5.5" rx="8" ry="3"/>'],
    palette: ['<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3z"/>', '', '<circle cx="7.5" cy="11" r="1.4"/><circle cx="10.5" cy="7" r="1.4"/><circle cx="15" cy="7.5" r="1.4"/>'],
    card: ['<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>', '<path d="M2.5 8a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v2h-19z"/>'],
    crown: ['<path d="M3.5 8.5 7.5 12 12 5l4.5 7 4-3.5-1.8 9.5a1.5 1.5 0 0 1-1.5 1.2H6.8a1.5 1.5 0 0 1-1.5-1.2z"/>', '<path d="M3.5 8.5 7.5 12 12 5l4.5 7 4-3.5-1.8 9.5a1.5 1.5 0 0 1-1.5 1.2H6.8a1.5 1.5 0 0 1-1.5-1.2z"/>'],
    shield: ['<path d="M12 3 19.5 6v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>', '<path d="M12 3 19.5 6v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/>'],
    lock: ['<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5v-3a4 4 0 0 1 8 0v3M12 15v2"/>', '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/>'],
    key: ['<circle cx="8" cy="15" r="4.5"/><path d="m11.2 11.8 8.3-8.3M17 6l2.5 2.5M14.5 8.5l2 2"/>', '<circle cx="8" cy="15" r="4.5"/>'],
    tenant: ['<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/>', '<circle cx="12" cy="12" r="5.5"/>', '<circle cx="12" cy="12" r="2"/>'],
    compass: ['<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>', '<path d="m15.5 8.5-2 5-5 2 2-5z"/>'],
    globe: ['<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>', '<path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>'],
    type: ['<path d="M4.5 7V5.5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1V7M12 4.5v15M9 19.5h6"/>'],
    eye: ['<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', '<circle cx="12" cy="12" r="3"/>'],
    sun: ['<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>', '<circle cx="12" cy="12" r="4"/>'],
    moon: ['<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.8 6.8 0 0 0 11 11z"/>', '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.8 6.8 0 0 0 11 11z"/>'],
    bus: ['<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v2.5M16 18v2.5M8 14.5h.01M16 14.5h.01"/>', '<path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5H4z"/>'],
    smartphone: ['<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18.5h2"/>', '<rect x="6" y="2.5" width="12" height="19" rx="3"/>'],
    monitor: ['<rect x="2.5" y="3.5" width="19" height="13" rx="2.5"/><path d="M8 20.5h8M12 16.5v4"/>', '<rect x="2.5" y="3.5" width="19" height="13" rx="2.5"/>'],
    sync: ['<path d="M20 11.5A8 8 0 0 0 5.6 6.6L4 8.5M4 4v4.5h4.5M4 12.5a8 8 0 0 0 14.4 4.9l1.6-1.9M20 20v-4.5h-4.5"/>'],
    link: ['<path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3M14 10.5a4.5 4.5 0 0 0-6.4-.4l-2.8 2.8a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3"/>'],
    share: ['<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 13.2 7.6 4.1M15.8 6.7 8.2 10.8"/>', '<circle cx="6" cy="12" r="2.5"/>'],
    play: ['<path d="M7 5.2a1.5 1.5 0 0 1 2.3-1.3l10 6.8a1.5 1.5 0 0 1 0 2.5l-10 6.8A1.5 1.5 0 0 1 7 18.8z"/>', '<path d="M7 5.2a1.5 1.5 0 0 1 2.3-1.3l10 6.8a1.5 1.5 0 0 1 0 2.5l-10 6.8A1.5 1.5 0 0 1 7 18.8z"/>'],
    pause: ['<rect x="5.5" y="4" width="4.5" height="16" rx="1.5"/><rect x="14" y="4" width="4.5" height="16" rx="1.5"/>', '<rect x="5.5" y="4" width="4.5" height="16" rx="1.5"/><rect x="14" y="4" width="4.5" height="16" rx="1.5"/>'],
    'skip-forward': ['<path d="M5 6.2a1.2 1.2 0 0 1 1.9-1l8.3 5.8a1.2 1.2 0 0 1 0 2l-8.3 5.8a1.2 1.2 0 0 1-1.9-1z"/><path d="M19 5v14"/>', '<path d="M5 6.2a1.2 1.2 0 0 1 1.9-1l8.3 5.8a1.2 1.2 0 0 1 0 2l-8.3 5.8a1.2 1.2 0 0 1-1.9-1z"/>'],
    volume: ['<path d="M11 5 6.5 8.5H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.5L11 19z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12"/>', '<path d="M11 5 6.5 8.5H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.5L11 19z"/>'],
    trash: ['<path d="M4 6.5h16M9.5 6.5v-2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 6.5l.9 12.6a2.5 2.5 0 0 0 2.5 2.4h5.2a2.5 2.5 0 0 0 2.5-2.4L18 6.5M10 11v6M14 11v6"/>'],
    logout: ['<path d="M9.5 20.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5h3.5M15.5 16.5 20 12l-4.5-4.5M20 12H9"/>'],
    'check-circle': ['<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>', '<circle cx="12" cy="12" r="9"/>'],
    alert: ['<path d="M10.3 4.2a2 2 0 0 1 3.4 0l7.6 13a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3z"/><path d="M12 10v3.5M12 17h.01"/>', '<path d="M10.3 4.2a2 2 0 0 1 3.4 0l7.6 13a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3z"/>'],
    star: ['<path d="M11.1 3.8a1 1 0 0 1 1.8 0l2 4.1 4.5.7a1 1 0 0 1 .6 1.7l-3.3 3.2.8 4.5a1 1 0 0 1-1.5 1.1L12 17l-4 2.1a1 1 0 0 1-1.5-1.1l.8-4.5L4 10.3a1 1 0 0 1 .6-1.7l4.5-.7z"/>', '<path d="M11.1 3.8a1 1 0 0 1 1.8 0l2 4.1 4.5.7a1 1 0 0 1 .6 1.7l-3.3 3.2.8 4.5a1 1 0 0 1-1.5 1.1L12 17l-4 2.1a1 1 0 0 1-1.5-1.1l.8-4.5L4 10.3a1 1 0 0 1 .6-1.7l4.5-.7z"/>'],
    list: ['<path d="M9 6h11.5M9 12h11.5M9 18h11.5"/>', '', '<circle cx="4.5" cy="6" r="1.3"/><circle cx="4.5" cy="12" r="1.3"/><circle cx="4.5" cy="18" r="1.3"/>'],
    plus: ['<path d="M12 5v14M5 12h14"/>'],
    check: ['<path d="m5 12.5 4.5 4.5L19 7.5"/>'],
    close: ['<path d="M6 6l12 12M18 6 6 18"/>'],
    'chevron-right': ['<path d="m9 6 6 6-6 6"/>'],
    'arrow-right': ['<path d="M5 12h14M13 6l6 6-6 6"/>'],
    'arrow-up-right': ['<path d="M7 17 17 7M8 7h9v9"/>'],
    more: ['', '', '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>'],
    menu: ['<path d="M4 7h16M4 12h16M4 17h10"/>'],
    loader: ['<path d="M12 3a9 9 0 1 0 9 9"/>'],
    'x-circle': ['<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>', '<circle cx="12" cy="12" r="9"/>'],
    'chevron-left': ['<path d="m15 6-6 6 6 6"/>'],
    'chevron-up': ['<path d="m6 15 6-6 6 6"/>'],
    'eye-off': ['<path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.6 6.6A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"/>'],
    rewind: ['<path d="M11 6.2a1.2 1.2 0 0 0-1.9-1L2.8 11a1.2 1.2 0 0 0 0 2l6.3 5.8a1.2 1.2 0 0 0 1.9-1zM21 6.2a1.2 1.2 0 0 0-1.9-1L12.8 11a1.2 1.2 0 0 0 0 2l6.3 5.8a1.2 1.2 0 0 0 1.9-1z"/>', '<path d="M11 6.2a1.2 1.2 0 0 0-1.9-1L2.8 11a1.2 1.2 0 0 0 0 2l6.3 5.8a1.2 1.2 0 0 0 1.9-1z"/>'],
    'fast-forward': ['<path d="M13 6.2a1.2 1.2 0 0 1 1.9-1l6.3 5.8a1.2 1.2 0 0 1 0 2l-6.3 5.8a1.2 1.2 0 0 1-1.9-1zM3 6.2a1.2 1.2 0 0 1 1.9-1l6.3 5.8a1.2 1.2 0 0 1 0 2l-6.3 5.8A1.2 1.2 0 0 1 3 17.8z"/>', '<path d="M13 6.2a1.2 1.2 0 0 1 1.9-1l6.3 5.8a1.2 1.2 0 0 1 0 2l-6.3 5.8a1.2 1.2 0 0 1-1.9-1z"/>'],
    filter: ['<path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h14a1.5 1.5 0 0 1 1.1 2.5L14.5 13v5.5l-5 2.5V13L3.9 6.5a1.5 1.5 0 0 1-.4-1z"/>', '<path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h14a1.5 1.5 0 0 1 1.1 2.5L14.5 13v5.5l-5 2.5V13L3.9 6.5a1.5 1.5 0 0 1-.4-1z"/>'],
    grid: ['<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>', '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/>'],
    mail: ['<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3.5 7 8.5 6 8.5-6"/>', '<rect x="3" y="5" width="18" height="14" rx="3"/>'],
    'panel-left': ['<rect x="3" y="3.5" width="18" height="17" rx="3"/><path d="M9.5 3.5v17M14 10l2 2-2 2"/>', '<path d="M6 3.5h3.5v17H6a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3z"/>'],
    'panel-left-close': ['<rect x="3" y="3.5" width="18" height="17" rx="3"/><path d="M9.5 3.5v17M16 10l-2 2 2 2"/>', '<path d="M6 3.5h3.5v17H6a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3z"/>'],
  };
  I['chevron-down'] = ['<path d="m6 9 6 6 6-6"/>'];
  I.info = ['<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>', '<circle cx="12" cy="12" r="9"/>'];
  I.audiobook = I.headphones; I.read = I['book-open']; I.goals = I.target; I.streak = I.flame; I.sanchika = I.flashcards;
  Object.assign(I, { pdf: I.file, highlight: I.highlighter, contents: I.list, edit: I.annotate, flashcard: I.flashcards, class: I.users, overdue: I.clock,
    subscription: I.card, branding: I.palette, admin: I.shield, profile: I.user, theme: I.moon, 'shield-check': I.shield });
  class BBIco extends HTMLElement {
    static get observedAttributes() { return ['name', 'size', 'tone', 'hue', 'stroke']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const g = I[this.getAttribute('name')];
      const s = parseFloat(this.getAttribute('size')) || 24;
      Object.assign(this.style, { display: 'inline-flex', flex: 'none', width: s + 'px', height: s + 'px', lineHeight: 0 });
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      if (!g) { root.innerHTML = ''; return; }
      const tone = this.getAttribute('tone') || 'line';
      const hue = this.getAttribute('hue') || (g[3] === 'b' ? 'b' : 'a');
      const acc = hue === 'b' ? 'var(--ic-accent-b, #3B5BDB)' : 'var(--ic-accent, #FF4D00)';
      const sw = this.getAttribute('stroke') || (s <= 18 ? 1.7 : s >= 40 ? 1.35 : 1.5);
      const [st, soft = '', solid = ''] = g;
      const ink = tone === 'active' ? acc : tone === 'onfill' ? '#fff' : 'currentColor';
      const fillC = tone === 'onfill' ? '#fff' : acc;
      const softOp = tone === 'onfill' ? '.24' : tone === 'active' ? '.16' : '.16';
      const showSoft = tone !== 'line' && soft;
      const solidFill = tone === 'line' ? 'currentColor' : tone === 'onfill' ? '#fff' : acc;
      root.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" style="display:block;overflow:visible">`
        + (showSoft ? `<g style="fill:${fillC}" opacity="${softOp}" stroke="none">${soft}</g>` : '')
        + (st ? `<g style="stroke:${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none">${st}</g>` : '')
        + (solid ? `<g style="fill:${solidFill}" stroke="none">${solid}</g>` : '')
        + '</svg>';
    }
  }
  customElements.define('bb-ico', BBIco);
  window.BB_ICO = Object.keys(I);
})();
