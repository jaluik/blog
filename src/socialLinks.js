const githubIcon = `<svg class="social-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.3-3.2-.1-.3-.6-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.7 4.7 18.7 5 18.7 5c.7 1.7.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" fill="currentColor"/></svg>`
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
