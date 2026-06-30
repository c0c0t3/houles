import { Base } from '@studiometa/js-toolkit';
import { toggleClass } from '@studiometa/js-toolkit/utils';
import quantize from 'quantize';

class InspirationSlide extends Base {
    static config = {
        name: 'InspirationSlide',
        refs: [
            'toggleTooltipButton',
            'tooltipContainer',
            'image',
            'colorPalette'
        ]
    };

    /**
     * On click to tooltipButton, toggle display tooltipContainer
     * @returns 
     */
    onToggleTooltipButtonChange(event) {
        toggleClass(this.$refs.tooltipContainer, 'opacity-0 pointer-events-none');
    }
    
    mounted() {
        this.getColors();
        // console.log('✅ InspirationSlide mounted', this.$el.dataset.id);
    }

    destroyed() {
        // console.log('🗑 InspirationSlide destroyed', this.$el.dataset.id);
    }


    /**
     * Get color from Image
     */
    getColors() {
        // console.log('getcolors')
        const img = this.$refs.image;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Réduire la taille pour de meilleures performances
        const maxSize = 150;
        const ratio = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
        canvas.width = img.naturalWidth * ratio;
        canvas.height = img.naturalHeight * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const pixelArray = [];
        
        // Extraire tous les pixels
        // Extraire tous les pixels
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            // ignorer pixels trop sombres
            if (r < 40 && g < 40 && b < 40) continue;

            // ignorer pixels trop clairs
            if (r > 220 && g > 220 && b > 220) continue;

            // ✅ garder le pixel
            pixelArray.push([r, g, b]);
        }

        
        // Créer une palette de 5 couleurs
        const colorMap = quantize(pixelArray, 8);
        const palette = colorMap ? colorMap.palette() : [];
        
        // Calculer la population de chaque couleur
        const colorCounts = this.calculateColorPopulation(pixelArray, palette);
        
        this.displayColorsWithPercentage(colorCounts);
    }

    /**
     * Calculate percenzage of extracted color
     * @param {*} pixels 
     * @param {*} palette 
     * @returns 
     */
    calculateColorPopulation(pixels, palette) {
        // Initialiser les compteurs
        const counts = palette.map(color => ({
            rgb: color,
            count: 0
        }));
        
        // Pour chaque pixel, trouver la couleur de palette la plus proche
        pixels.forEach(pixel => {
            let minDistance = Infinity;
            let closestIndex = 0;
            
            palette.forEach((paletteColor, index) => {
                const distance = 0.3 * Math.pow(pixel[0] - paletteColor[0], 2) + 0.59 * Math.pow(pixel[1] - paletteColor[1], 2) + 0.11 * Math.pow(pixel[2] - paletteColor[2], 2);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });
            
            counts[closestIndex].count++;
        });
        
        // Trier par population décroissante
        return counts.sort((a, b) => b.count - a.count);
    }

    /**
     * Put colors into colorPalette
     * @param {*} colors 
     */
    displayColorsWithPercentage(colors) {
        const container = this.$refs.colorPalette;
        container.innerHTML = '';
        container.className = 'hellopalette absolute top-24 l:top-6 left-0 flex flex-col h-[calc(33svh-1.5rem)] max-h-[200px] w-[24px]';
        
        const total = colors.reduce((sum, c) => sum + c.count, 0);
        
        colors.forEach(color => {
            const percentage = ((color.count / total) * 100).toFixed(1);
            const colorDiv = document.createElement('div');
            colorDiv.style.backgroundColor = `rgb(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`;
            colorDiv.style.height = `${percentage}%`;
            colorDiv.className = 'w-full';
            colorDiv.title = `${percentage}%`;
            container.appendChild(colorDiv);
        });
    }


}

export default InspirationSlide;