// Replace this URL with your authenticated backend endpoint when it is ready.
// A failed request is shown as an error; production never silently uses demo data.
export const config = Object.freeze({
  dataUrl: './data/recap.json',
  animation: {
    counterDuration: 1900,
    digitStagger: 180,
    entranceDuration: 1050,
    parallaxStrength: 1,
  },
});
