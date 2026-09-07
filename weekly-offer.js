(() => {
  const offer = document.getElementById('weekly-offer');
  if (!offer) return;
  const deadline = Date.parse(offer.dataset.endsAt);
  if (!Number.isFinite(deadline)) return;
  const days = offer.querySelector('[data-days]');
  const hours = offer.querySelector('[data-hours]');
  const minutes = offer.querySelector('[data-minutes]');
  function update() {
    const remaining = Math.max(0, deadline - Date.now());
    const totalMinutes = Math.ceil(remaining / 60000);
    days.textContent = String(Math.floor(totalMinutes / 1440)).padStart(2, '0');
    hours.textContent = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    minutes.textContent = String(totalMinutes % 60).padStart(2, '0');
    if (remaining === 0) {
      offer.querySelector('[role=timer]').setAttribute('aria-label', 'Təklifin vaxtı bitdi');
      clearInterval(interval);
    }
  }
  const interval = setInterval(update, 1000);
  update();
})();
