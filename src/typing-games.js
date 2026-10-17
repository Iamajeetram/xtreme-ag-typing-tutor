import { launchSpaceDefender } from './space-defender.js'
import { launchArcadeMode } from './arcade-modes.js'

const gameData = {
  'space-defender': { title: 'Space Defender: Typing Odyssey', subtitle: 'LOCK · TYPE · DESTROY', description: 'Lock onto glowing asteroid words and blast them before they escape.', icon: '🚀', theme: 'space', tags: ['Target lock', 'Laser blast', 'Freeze + bomb'] },
  'cyberpunk-racer': { title: 'Cyberpunk Nitro Racer', subtitle: 'TYPE TO HIT THE NITRO', description: 'Race through a neon city. Type each lane word to boost past rivals.', icon: '🏎️', theme: 'racer', tags: ['Neon highway', 'Nitro combo', 'Rival racers'] },
  'undersea-bubble-blast': { title: 'Undersea Bubble Blast', subtitle: 'DIVE · TYPE · POP', description: 'Pop rising ocean bubbles before they reach the surface. Chain bubbles for bonus points.', icon: '🫧', theme: 'ocean', tags: ['Rising bubbles', 'Oxygen pearls', 'Chain blast'] },
}

export function renderGames() {
  return `<div class="arcade-page-intro"><div><span class="arcade-eyebrow">XTREME AG ARCADE</span><h2>Choose your world</h2><p>Three different typing games. Real-time movement, targets, combos and mission reports.</p></div><div class="arcade-intro-orb">⌨</div></div>
  <div class="arcade-game-grid">${Object.entries(gameData).map(([id,g]) => `<article class="arcade-game-card ${g.theme}-card"><div class="arcade-card-art ${g.theme}-art"><span class="arcade-art-icon">${g.icon}</span><span class="arcade-art-word one">${g.theme==='space'?'LASER':g.theme==='racer'?'NITRO':'PEARL'}</span><span class="arcade-art-word two">${g.theme==='space'?'SHIELD':g.theme==='racer'?'TURBO':'CORAL'}</span><span class="arcade-art-word three">${g.theme==='space'?'BOOST':g.theme==='racer'?'MATRIX':'SPLASH'}</span></div><div class="arcade-card-copy"><span class="arcade-eyebrow">${g.subtitle}</span><h3>${g.title}</h3><p>${g.description}</p><div class="arcade-tags">${g.tags.map(t=>`<span>${t}</span>`).join('')}</div><button class="primary-button arcade-launch" data-game="${id}">Play game <span>→</span></button></div></article>`).join('')}</div>
  <section id="game-stage" class="typing-test-card game-stage arcade-stage" hidden></section>`
}

export function bindGameActions() {
  document.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => {
    const stage = document.querySelector('#game-stage')
    if (!stage) return
    if (button.dataset.game === 'space-defender') launchSpaceDefender(stage)
    else launchArcadeMode(stage, button.dataset.game)
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }))
}
