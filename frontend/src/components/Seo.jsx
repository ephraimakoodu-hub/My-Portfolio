import { useEffect } from 'react';

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonical(href) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

// Sets document title/meta tags for the current route. Admin pages call this
// with noindex so they never end up in search results.
export default function Seo({ title, description, noindex = false, image }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) setMeta('description', description);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    if (image) setMeta('og:image', image, 'property');
    setMeta('twitter:card', 'summary_large_image');
    setCanonical(window.location.origin + window.location.pathname);
  }, [title, description, noindex, image]);

  return null;
}
