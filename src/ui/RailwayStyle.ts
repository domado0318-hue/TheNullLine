import { uiConfig } from '../config/ui';

/** Artwork supplies enamel and hardware; layout and all text stay live. */
export function railwayStyle(): string {
  const c = uiConfig.railway, a = uiConfig.art;
  const f = a.panelFrame, s = a.panelSize;
  return `
    .rail-ui { --ink:${c.ink}; --paper:${c.enamel}; --edge:${c.edge}; --teal:${c.teal};
      --route:${c.route}; --red:${c.warning}; color:var(--paper); }
    .rail-ui * { box-sizing:border-box; }
    .rail-ui .rail-enamel {
      background-color:transparent; background-image:url('${a.panel}'); background-repeat:no-repeat;
      background-size:${s.width / f.width * 100}% ${s.height / f.height * 100}%;
      background-position:${f.x / (s.width - f.width) * 100}% ${f.y / (s.height - f.height) * 100}%;
      color:var(--ink);
    }
    .rail-ui .rail-heading {
      position:absolute; left:50%; transform:translate(-50%,-50%);
      width:${c.signWidth}px; height:${c.signHeight}px; display:flex; align-items:center;
      justify-content:center; padding:0 ${c.hudPadding}px ${c.stripe}px;
      font-size:${uiConfig.titleFontSize}px; font-weight:400; letter-spacing:1px;
    }
    .rail-ui .rail-heading-label { line-height:1; }
    .rail-ui button { position:relative; font:inherit; cursor:pointer; padding:0; border:0; color:var(--ink); font-weight:400; }
    .rail-ui button:focus-visible { outline:3px solid var(--route); outline-offset:5px; }
    .rail-ui .rail-action {
      display:flex; align-items:center; justify-content:center;
      padding:0 ${c.arrowSize + c.hudPadding}px ${c.stripe}px ${c.hudPadding}px; white-space:nowrap;
    }
    .rail-ui .rail-action > .rail-icon {
      position:absolute; right:${c.hudPadding}px; top:50%; transform:translateY(-56%);
      width:${c.arrowSize - 8}px; height:${c.arrowSize - 8}px;
    }
    .rail-ui .rail-return > .rail-icon { transform:translateY(-56%) rotate(180deg); }
    .rail-ui .rail-action:hover { filter:brightness(1.08); }
    .rail-ui .rail-title-button {
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:${uiConfig.titleScreen.routeGap}px; padding:0;
      background:none; border:0; box-shadow:none; color:${uiConfig.titleScreen.textColor};
    }
    .rail-ui .rail-title-label { line-height:1; }
    .rail-ui .rail-title-route {
      width:${uiConfig.titleScreen.routeWidth}px; height:${uiConfig.titleScreen.routeHeight}px;
      pointer-events:none;
    }
    .rail-ui .rail-title-button:hover, .rail-ui .rail-title-button:focus-visible { color:var(--route); }
    .rail-ui .rail-card {
      display:flex; flex-direction:column; overflow:hidden; text-align:left; background:var(--teal);
      color:var(--paper); border:2px solid var(--edge); border-radius:${c.radius}px;
      box-shadow:0 ${c.shadow}px 0 rgba(0,0,0,.4); line-height:${c.lineHeight}; white-space:normal;
    }
    .rail-ui .rail-card .rail-card-title {
      flex-shrink:0; height:${c.cardTitleHeight}px; padding:0 22px ${c.stripe}px;
      display:flex; align-items:center; justify-content:center; font-size:${c.cardTitleSize}px; font-weight:400;
    }
    .rail-ui .rail-card:hover, .rail-ui .rail-card:focus-visible { border-color:var(--route); }
    .rail-ui .rail-card:hover .rail-card-title, .rail-ui .rail-card:focus-visible .rail-card-title { filter:brightness(1.08); }
    .rail-ui .rail-portrait { display:block; width:100%; object-fit:contain; flex-shrink:0; padding:8px; }
    .rail-ui .rail-card-content {
      display:flex; flex-direction:column; gap:10px; padding:${uiConfig.cards.padding}px; flex:1; min-height:0;
    }
    .rail-ui .rail-weapon { font-size:${uiConfig.bodyFontSize}px; display:flex; align-items:center; gap:10px; }
    .rail-ui .rail-weapon > .rail-icon { width:${a.statIconSize}px; height:${a.statIconSize}px; flex-shrink:0; }
    .rail-ui .rail-trait, .rail-ui .rail-description { font-size:${c.detailFontSize}px; color:${c.muted}; font-weight:400; }
    .rail-ui .rail-stats {
      margin-top:auto; display:flex; align-items:center; justify-content:center;
      gap:${a.statGap}px; padding-top:8px; border-top:1px solid ${c.tealLight};
    }
    .rail-ui .rail-stat { display:flex; align-items:center; gap:8px; font-size:${uiConfig.bodyFontSize}px; }
    .rail-ui .rail-stat > .rail-icon { width:${a.statIconSize}px; height:${a.statIconSize}px; }
    .rail-ui .rail-icon { display:inline-grid; place-items:center; flex-shrink:0; pointer-events:none; }
    .rail-ui .rail-icon-art { display:block; background-repeat:no-repeat; }
    .rail-ui .rail-skill-icon { width:${c.iconSize}px; height:${c.iconSize}px; margin:20px auto 0; flex-shrink:0; }
    .rail-ui .rail-rank { font-size:${c.detailFontSize}px; color:var(--paper); }
    .rail-ui .rail-effect {
      margin-top:auto; padding-top:12px; border-top:1px solid ${c.tealLight};
      color:var(--route); font-size:${uiConfig.bodyFontSize}px; font-weight:400; white-space:pre-line;
    }
    .rail-ui .rail-notice { width:90%; max-height:72px; overflow:auto; scrollbar-width:thin; line-height:1.5; }
    .rail-ui .rail-danger { color:var(--red); width:840px; }
  `;
}
