import { Container, Sprite, Texture, Text, TextStyle, Graphics } from 'pixi.js';

let cachedBalloonTexture = null;

/**
 * Generates an ultra high-definition cached texture for the glassy balloon
 * based directly on the exact Figma CSS properties:
 * - Ellipse 251: Base #5439C6
 * - Ellipse 247: rgba(217, 217, 217, 0.55) + 2 inset shadows rgba(6, 49, 46, ...)
 * - Ellipse 249: rgba(0, 4, 4, 0.34)
 * - Ellipse 250: rgba(229, 167, 255, 0.32)
 * - Ellipse 248: rgba(255, 255, 255, 0.67) rotated -35.06deg
 */
function getBalloonTexture() {
  if (cachedBalloonTexture) return cachedBalloonTexture;

  const size = 312; // 3x of 104px for ultra crisp rendering
  const s = size / 104; // scale factor = 3
  const r = 52 * s; // 156px radius
  const cx = r;
  const cy = r;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Clip everything to the circular balloon body
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // 1. Ellipse 251: Base #5439C6
  ctx.fillStyle = '#5439C6';
  ctx.fillRect(0, 0, size, size);

  // 2. Ellipse 247: rgba(217, 217, 217, 0.55)
  ctx.fillStyle = 'rgba(217, 217, 217, 0.55)';
  ctx.fillRect(0, 0, size, size);

  // 3. Ellipse 247 Inset Shadows with visible Gaussian blur:
  // - Top inset shadow: 0px 4px 28.2px rgba(6, 49, 46, 0.81)
  // - Bottom inset shadow: 0px -5px 7.7px rgba(6, 49, 46, 0.77)
  
  // Ambient radial rim shadow around perimeter
  const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
  rimGrad.addColorStop(0, 'rgba(6, 49, 46, 0)');
  rimGrad.addColorStop(1, 'rgba(6, 49, 46, 0.4)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Top blurred inset shadow (deep 28.2px blur)
  ctx.save();
  try {
    ctx.filter = `blur(${9 * s}px)`;
  } catch (e) {}
  const topShadowGrad = ctx.createLinearGradient(cx, cy - r - 4 * s, cx, cy - r + 38 * s);
  topShadowGrad.addColorStop(0, 'rgba(6, 49, 46, 0.95)');
  topShadowGrad.addColorStop(0.35, 'rgba(6, 49, 46, 0.65)');
  topShadowGrad.addColorStop(0.7, 'rgba(6, 49, 46, 0.25)');
  topShadowGrad.addColorStop(1, 'rgba(6, 49, 46, 0)');
  ctx.fillStyle = topShadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy - r + 12 * s, r * 0.98, 28 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Bottom blurred inset shadow (7.7px blur)
  ctx.save();
  try {
    ctx.filter = `blur(${4 * s}px)`;
  } catch (e) {}
  const bottomShadowGrad = ctx.createLinearGradient(cx, cy + r + 4 * s, cx, cy + r - 22 * s);
  bottomShadowGrad.addColorStop(0, 'rgba(6, 49, 46, 0.9)');
  bottomShadowGrad.addColorStop(0.4, 'rgba(6, 49, 46, 0.55)');
  bottomShadowGrad.addColorStop(0.75, 'rgba(6, 49, 46, 0.2)');
  bottomShadowGrad.addColorStop(1, 'rgba(6, 49, 46, 0)');
  ctx.fillStyle = bottomShadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r - 8 * s, r * 0.95, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Ellipse 249: rgba(0, 4, 4, 0.34)
  // width: 82px, height: 82px, left: 6131px, top: 797px (relative: left 3, top 20)
  // center: (3 + 41, 20 + 41) = (44, 61), radius: 41
  ctx.beginPath();
  ctx.arc(44 * s, 61 * s, 41 * s, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 4, 4, 0.34)';
  ctx.fill();

  // 5. Ellipse 250: rgba(229, 167, 255, 0.32)
  // width: 52px, height: 52px, left: 6180px, top: 797px (relative: left 52, top 20)
  // center: (52 + 26, 20 + 26) = (78, 46), radius: 26
  ctx.beginPath();
  ctx.arc(78 * s, 46 * s, 26 * s, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(229, 167, 255, 0.32)';
  ctx.fill();

  // 6. Ellipse 248: rgba(255, 255, 255, 0.67), rotate(-35.06deg)
  // width: 10.31px, height: 11.45px, left: 6195px, top: 785px (relative: left 67, top 8)
  // center: (67 + 5.155, 8 + 5.725) = (72.155, 13.725)
  // radiusX: 5.155, radiusY: 5.725
  ctx.save();
  ctx.translate(72.155 * s, 13.725 * s);
  ctx.rotate((-35.06 * Math.PI) / 180);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.155 * s, 5.725 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.67)';
  ctx.fill();
  ctx.restore();

  // Restore clip
  ctx.restore();

  // Edge antialiasing rim
  ctx.beginPath();
  ctx.arc(cx, cy, r - 0.5 * s, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(6, 49, 46, 0.5)';
  ctx.lineWidth = 1 * s;
  ctx.stroke();

  cachedBalloonTexture = Texture.from(canvas);
  return cachedBalloonTexture;
}

export class Balloon {
  constructor(x, y, type = 'normal', letter = 'A') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.letter = letter;
    this.active = true;
    this.hitLockTimer = 0;
    this.wrongFlashTimer = 0;

    // Balloon types configuration matching Figma proportions
    const types = {
      small: { radius: 25, speed: 3.2, points: 25, color: 0xc084fc, scoreColor: '#c084fc' },
      normal: { radius: 32, speed: 2.0, points: 10, color: 0x8b5cf6, scoreColor: '#c084fc' },
      large: { radius: 38, speed: 1.4, points: 5, color: 0x6d4cc4, scoreColor: '#c084fc' },
      special: { radius: 30, speed: 3.8, points: 50, color: 0xe879f9, scoreColor: '#e879f9' }
    };

    const config = types[type] || types.normal;
    this.radius = config.radius;
    this.speed = config.speed;
    this.points = config.points;
    this.color = config.color;
    this.scoreColor = config.scoreColor;

    // Horizontal sway config (sine wave simulation)
    this.swaySpeed = 0.02 + Math.random() * 0.02;
    this.swayAmount = 10 + Math.random() * 10;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.time = 0;

    // Container
    this.view = new Container();
    this.view.x = x;
    this.view.y = y;

    // Balloon body sprite using the Figma-exact generated texture
    this.sprite = new Sprite(getBalloonTexture());
    this.sprite.anchor.set(0.5);
    this.sprite.width = this.radius * 2;
    this.sprite.height = this.radius * 2;
    this.view.addChild(this.sprite);

    // Letter Text: Inter 700, #FFFFFF
    const textStyle = new TextStyle({
      fontFamily: '"Inter", sans-serif',
      fontSize: Math.round(this.radius * 1.23), // 64px on 104px balloon
      fontWeight: '700',
      fill: '#ffffff',
      align: 'center'
    });
    this.letterText = new Text({ text: this.letter, style: textStyle });
    this.letterText.anchor.set(0.5);
    this.letterText.x = 0;
    this.letterText.y = -this.radius * 0.04; // optical center for Arabic glyphs
    this.view.addChild(this.letterText);

    // Kept inside the balloon container so the feedback follows its motion.
    this.wrongFlash = new Graphics();
    this.wrongFlash.circle(0, 0, this.radius * 0.94);
    this.wrongFlash.fill({ color: 0xff2638, alpha: 0.78 });
    this.wrongFlash.alpha = 0;
    this.view.addChild(this.wrongFlash);
  }

  flashWrong() {
    this.hitLockTimer = 16;
    this.wrongFlashTimer = 16;
  }

  canBeHit() {
    return this.active && this.hitLockTimer <= 0;
  }

  update(ticker, scrollX) {
    this.time += ticker.deltaTime;
    if (this.hitLockTimer > 0) this.hitLockTimer -= ticker.deltaTime;
    if (this.wrongFlashTimer > 0) {
      this.wrongFlashTimer -= ticker.deltaTime;
      const progress = Math.max(0, this.wrongFlashTimer / 16);
      this.wrongFlash.alpha = progress * 0.8;
      const pulse = 1 + (1 - progress) * 0.12;
      this.wrongFlash.scale.set(pulse);
    } else {
      this.wrongFlash.alpha = 0;
      this.wrongFlash.scale.set(1);
    }
    
    // Float upwards
    this.y -= this.speed * ticker.deltaTime;

    // Horizontal sway (sine wave)
    const sway = Math.sin(this.time * this.swaySpeed + this.swayOffset) * this.swayAmount * 0.05;
    this.view.x += sway;

    // Apply scene scrolling speed (if any)
    this.view.x -= scrollX;
    
    // Update internal positions
    this.x = this.view.x;
    this.view.y = this.y;

    // Deactivate if balloon floats out of top screen boundary
    if (this.y < -this.radius * 2) {
      this.active = false;
    }
  }

  destroy() {
    // Destroy display objects without destroying shared texture
    this.view.destroy({ children: true, texture: false });
  }
}
