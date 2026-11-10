(() => {
  const jobs = Array.from(document.querySelectorAll('.vacancy'));
  jobs.forEach(job => job.addEventListener('toggle', () => {
    if (job.open) jobs.forEach(other => { if (other !== job) other.open = false; });
  }));
  function openLinkedJob() {
    const id = location.hash.slice(1);
    if (!/^vakansiya-\d+$/.test(id)) return;
    const job = document.getElementById(id);
    if (job?.classList.contains('vacancy')) {
      job.open = true;
      job.scrollIntoView({ block:'start' });
    }
  }
  window.addEventListener('hashchange', openLinkedJob);
  openLinkedJob();
})();
