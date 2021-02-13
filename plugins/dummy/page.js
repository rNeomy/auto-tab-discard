const args = new URLSearchParams(location.search);

document.title = args.get('title');
document.querySelector('link[rel="icon"]').href = args.get('icon');

document.addEventListener('click', () => {
  history.back();
});
