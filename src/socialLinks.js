const githubIcon = `<svg class="social-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.72-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.05.14 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.62-5.47 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.19.69.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12Z" fill="currentColor"/></svg>`
const xIcon = `<svg class="social-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.9 10.5 21.3 2h-1.8l-6.4 7.4L8 2H2l7.8 11.3L2 22h1.8l6.8-7.8L16 22h6l-8.1-11.5Zm-2.4 2.8-.8-1.1L4.4 3.3h2.8l5 7.1.8 1.1 6.6 9.4h-2.8l-5.3-7.6Z" fill="currentColor"/></svg>`

const icons = {
  github: githubIcon,
  x: xIcon,
}

function createSocialNavbarItem({ href, icon, label }) {
  return {
    type: 'html',
    position: 'right',
    className: 'social-navbar-item',
    value: `<a class="navbar__link social-navbar-link" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}">${icons[icon]}</a>`,
  }
}

function createFooterSocialLink({ href, icon, label }) {
  return `<a class="footer-social-link" href="${href}">${icons[icon]}<span>${label}</span></a>`
}

module.exports = {
  createFooterSocialLink,
  createSocialNavbarItem,
}
