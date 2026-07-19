- [ ] Confirm https://summitbank.onrender.com is served by Render Static Site (not Web Service)
- [ ] Configure Static Site Redirects/Rewrites for SPA fallback:
      - source: /(.*)
      - destination: /index.html
      - exclude: /api/* (if supported)
- [ ] Redeploy/publish the Static Site
- [ ] Verify https://summitbank.onrender.com/dashboard loads React

