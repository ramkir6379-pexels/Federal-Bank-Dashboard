import { Component, Input, OnChanges, OnInit, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import { ApiService } from '../../services/api.service';

interface HeatmapLayer {
  category: string;
  layer: L.Layer;
  type: 'gpkg';
}

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full relative">
      <div id="map" class="w-full h-full z-0 bg-[#e5e5e5]"></div>

      <!-- Top-left overlay -->
      <div class="absolute top-4 left-4 z-[400] bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/30 rounded-xl shadow-soft min-w-[180px] max-w-[240px]">

        <!-- Header row -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-manrope font-bold text-[13px] text-on-surface truncate">
              {{ activeBoundaryLabel || 'Map View' }}
            </span>
          </div>
          <p class="text-[10px] font-inter flex items-center gap-1 flex-shrink-0 ml-2"
             [ngClass]="loading ? 'text-primary' : 'text-on-surface-variant'">
            <span *ngIf="loading" class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            {{ loading ? 'Loading...' : 'Live' }}
          </p>
        </div>

        <!-- Categories dropdown toggle -->
        <button (click)="legendOpen = !legendOpen"
                class="flex items-center justify-between w-full px-4 py-2.5 hover:bg-surface-container-high transition-colors rounded-b-xl"
                [ngClass]="legendOpen ? 'rounded-b-none' : 'rounded-b-xl'">
          <div class="flex items-center gap-2 min-w-0">
            <!-- Color dots preview (max 3) -->
            <div class="flex -space-x-1">
              <span *ngFor="let item of activeLegend.slice(0,3)"
                    class="w-3 h-3 rounded-full border border-white flex-shrink-0"
                    [style.background-color]="item.color"></span>
            </div>
            <span class="text-[11px] font-inter text-on-surface-variant truncate">
              {{ activeLegend.length === 0 ? 'No categories' : activeLegend.length + ' categor' + (activeLegend.length === 1 ? 'y' : 'ies') }}
            </span>
          </div>
          <svg class="w-3.5 h-3.5 text-on-surface-variant flex-shrink-0 transition-transform duration-200"
               [ngClass]="legendOpen ? 'rotate-180' : ''"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <!-- Dropdown legend list -->
        <div class="overflow-hidden transition-all duration-200 ease-in-out"
             [ngStyle]="{'max-height': legendOpen ? '200px' : '0px'}">
          <div class="px-4 pb-3 pt-1 flex flex-col gap-1.5 overflow-y-auto max-h-[180px] border-t border-outline-variant/10">
            <div *ngFor="let item of activeLegend" class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" [style.background-color]="item.color"></span>
              <span class="text-[11px] font-inter text-on-surface-variant truncate">{{ item.name }}</span>
            </div>
            <div *ngIf="activeLegend.length === 0" class="text-[11px] text-on-surface-variant/60 font-inter py-1">
              Select categories from sidebar
            </div>
          </div>
        </div>
      </div>

      <!-- Map Style Toggle -->
      <div class="absolute top-4 right-4 z-[400] bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/30 rounded-xl p-1 shadow-soft flex items-center">
        <button (click)="setMapStyle('terrain')"
                [ngClass]="currentMapStyle === 'terrain' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'"
                class="px-3 py-1.5 rounded-lg text-[12px] font-manrope font-bold transition-all duration-200 cursor-pointer">
          Terrain
        </button>
        <button (click)="setMapStyle('satellite')"
                [ngClass]="currentMapStyle === 'satellite' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'"
                class="px-3 py-1.5 rounded-lg text-[12px] font-manrope font-bold transition-all duration-200 ml-1 cursor-pointer">
          Satellite
        </button>
      </div>
    </div>
  `,
  styles: [`
    #map { height: 100vh; width: 100%; border: none; }
    ::ng-deep .leaflet-control-container { z-index: 400; }
    ::ng-deep .geo-popup .leaflet-popup-content-wrapper {
      border-radius: 12px; padding: 0; overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }
    ::ng-deep .geo-popup .leaflet-popup-content { margin: 0; width: auto !important; }
  `]
})
export class MapViewComponent implements OnInit, OnChanges {
  @Input() categories: string[] = [];
  @Input() boundary: string | null = null;
  @Input() cityPincodes: string[] = [];
  @Input() usePerungudiFile = false;
  @Input() searchLocation: any = null;
  @Input() showHeatmaps = false;
  @Input() heatmapCategories: string[] = [];

  private map!: L.Map;
  private markers: L.Marker[] = [];
  private boundaryLayers: L.GeoJSON[] = [];
  private streetLayer: L.GeoJSON | null = null;
  private searchMarker: L.Marker | null = null;
  private heatmapLayers: HeatmapLayer[] = [];
  loading = false;
  private isBrowser: boolean;
  activeLegend: { name: string; color: string }[] = [];
  legendOpen = false;
  activeBoundaryLabel = '';
  currentMapStyle: 'terrain' | 'satellite' = 'terrain';
  private tileLayer!: L.TileLayer;

  constructor(private api: ApiService, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.map || !this.isBrowser) return;
    if (changes['searchLocation'] && this.searchLocation) {
      this.handleSearchLocation(this.searchLocation);
    } else if (changes['categories'] || changes['boundary'] || changes['cityPincodes'] || changes['usePerungudiFile']) {
      this.loadBoundaryAndData();
    } else if (this.usePerungudiFile && this.cityPincodes.length > 0) {
      this.loadBoundaryAndData();
    }
    if (changes['showHeatmaps'] || changes['heatmapCategories']) {
      if (this.showHeatmaps && this.heatmapCategories && this.heatmapCategories.length > 0) {
        this.clearMarkers();
        this.loadHeatmaps();
      } else {
        this.clearHeatmaps();
      }
    }
  }

  private initMap() {
    setTimeout(() => {
      this.map = L.map('map', { zoomControl: false }).setView([13.0827, 80.2707], 12);
      L.control.zoom({ position: 'bottomright' }).addTo(this.map);
      this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
      });
      this.tileLayer.addTo(this.map);
      this.loadBoundaryAndData();
    }, 100);
  }

  setMapStyle(style: 'terrain' | 'satellite') {
    if (this.currentMapStyle === style || !this.map) return;
    this.currentMapStyle = style;
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    if (style === 'terrain') {
      this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
      });
    } else {
      this.tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri', maxZoom: 19
      });
    }
    this.tileLayer.addTo(this.map);
    this.tileLayer.bringToBack();
  }

  private loadBoundaryAndData() {
    this.loading = true;
    if (this.searchMarker) { this.map.removeLayer(this.searchMarker); this.searchMarker = null; }

    // Single pincode boundary (existing behavior)
    if (this.boundary) {
      this.activeBoundaryLabel = this.boundary;
      this.api.getPincodeBoundaries().subscribe({
        next: (geojson) => {
          const feature = geojson.features.find((f: any) => String(f.properties.Pincode) === String(this.boundary));
          this.clearBoundaryLayers();
          if (feature) {
            this.drawBoundaryFeatures([feature]);
            this.api.getStreetBoundaries(this.boundary!).subscribe({
              next: (sg) => this.drawStreets(sg),
              error: (e) => console.error('Street load failed', e)
            });
          }
          this.loadData();
        },
        error: () => { this.clearBoundaryLayers(); this.loadData(); }
      });
    // Perungudi: use dedicated boundary file
    } else if (this.usePerungudiFile && this.cityPincodes.length > 0) {
      this.activeBoundaryLabel = 'Perungudi';
      this.clearBoundaryLayers();
      this.api.getPerungudiGeoJSON().subscribe({
        next: (geojson) => {
          const features = geojson.features || [geojson];
          if (features.length > 0) {
            this.drawBoundaryFeatures(features);
          }
          this.loadData();
        },
        error: () => { this.clearBoundaryLayers(); this.loadData(); }
      });
    // Other city: combined pincode boundaries
    } else if (this.cityPincodes && this.cityPincodes.length > 0) {
      this.activeBoundaryLabel = 'City Area';
      this.api.getPincodeBoundaries().subscribe({
        next: (geojson) => {
          const features = geojson.features.filter((f: any) =>
            this.cityPincodes.includes(String(f.properties.Pincode))
          );
          this.clearBoundaryLayers();
          if (features.length > 0) this.drawBoundaryFeatures(features);
          this.loadData();
        },
        error: () => { this.clearBoundaryLayers(); this.loadData(); }
      });
    } else {
      this.activeBoundaryLabel = '';
      this.clearBoundaryLayers();
      this.loadData();
    }
  }

  private drawBoundaryFeatures(features: any[]) {
    this.clearBoundaryLayers();
    const allLayers: L.GeoJSON[] = [];
    features.forEach(feature => {
      const layer = L.geoJSON(feature, {
        style: { color: '#3b82f6', weight: 2.5, opacity: 0.85, fillColor: '#60a5fa', fillOpacity: 0.12, dashArray: '5, 5' }
      }).addTo(this.map);
      this.boundaryLayers.push(layer);
      allLayers.push(layer);
    });
    if (allLayers.length > 0) {
      const group = L.featureGroup(allLayers);
      this.map.flyToBounds(group.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 1.2 });
    }
  }

  private drawStreets(geojson: any) {
    if (this.streetLayer) this.map.removeLayer(this.streetLayer);
    this.streetLayer = L.geoJSON(geojson, { style: { color: '#f59e0b', weight: 2, opacity: 0.6 } }).addTo(this.map);
  }

  private clearBoundaryLayers() {
    this.boundaryLayers.forEach(l => this.map.removeLayer(l));
    this.boundaryLayers = [];
    if (this.streetLayer) { this.map.removeLayer(this.streetLayer); this.streetLayer = null; }
  }

  private makeIcon(color: string): L.DivIcon {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color:${color};width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }

  private buildPopup(loc: any): string {
    const props = loc.properties || {};
    const skip = new Set(['lat', 'lng']);
    const rows = Object.entries(props)
      .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '')
      .slice(0, 5)
      .map(([k, v]) => {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const val = Array.isArray(v) ? (v as any[]).join(', ') : String(v);
        return `<tr>
          <td style="color:#888;font-size:11px;padding:2px 10px 2px 0;white-space:nowrap;vertical-align:top">${label}</td>
          <td style="font-size:11px;padding:2px 0;color:#1a1a1a;word-break:break-word;max-width:180px">${val}</td>
        </tr>`;
      }).join('');
    return `<div style="font-family:'Inter',sans-serif;min-width:240px;max-width:320px">
      <div style="background:${loc.color || '#6B7280'};padding:10px 14px 8px">
        <div style="font-weight:700;font-size:14px;color:#fff;line-height:1.3">${loc.name || 'Unknown'}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px">${(loc.category || '').replace(/_/g, ' ')}</div>
      </div>
      <div style="padding:10px 14px;max-height:220px;overflow-y:auto">
        <table style="border-collapse:collapse;width:100%">${rows}</table>
      </div>
    </div>`;
  }

  private loadData() {
    if (!this.categories || this.categories.length === 0) {
      this.clearMarkers();
      this.activeLegend = [];
      this.loading = false;
      return;
    }

    // Determine pincode filter: single pincode takes priority, else use city pincodes
    const pincodeFilter = this.boundary || null;

    this.api.getCategoryData(this.categories, pincodeFilter).subscribe({
      next: (res) => {
        this.clearMarkers();
        let locations: any[] = res.locations || [];

        // If city-level (multiple pincodes), filter client-side
        if (!this.boundary && this.cityPincodes && this.cityPincodes.length > 0) {
          locations = locations.filter(loc =>
            this.cityPincodes.includes(String(loc.properties?.pincode ?? ''))
          );
        }

        const legendMap = new Map<string, string>();
        locations.forEach(loc => {
          if (!legendMap.has(loc.category)) legendMap.set(loc.category, loc.color);
        });
        this.activeLegend = Array.from(legendMap.entries()).map(([cat, color]) => ({
          name: cat.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          color
        }));

        locations.forEach((loc: any) => {
          const icon = this.makeIcon(loc.color || '#6B7280');
          const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(this.map);
          const popup = L.popup({ className: 'geo-popup', maxWidth: 340 }).setContent(this.buildPopup(loc));
          marker.bindPopup(popup);
          marker.on('mouseover', () => marker.openPopup());
          this.markers.push(marker);
        });

        if (!this.boundary && (!this.cityPincodes || this.cityPincodes.length === 0) && locations.length > 0) {
          const group = L.featureGroup(this.markers);
          this.map.flyToBounds(group.getBounds(), { padding: [50, 50], maxZoom: 13, duration: 1 });
        } else if (!this.boundary && (!this.cityPincodes || this.cityPincodes.length === 0)) {
          this.map.flyTo([13.0827, 80.2707], 11);
        }
        this.loading = false;
      },
      error: (err) => { console.error('Error loading category data', err); this.loading = false; }
    });
  }

  private clearMarkers() {
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];
  }

  private handleSearchLocation(loc: any) {
    if (this.searchMarker) this.map.removeLayer(this.searchMarker);
    this.map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
    const searchIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color:#ef4444;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;background:white;border-radius:50%"></div></div>`,
      iconSize: [26, 26], iconAnchor: [13, 13]
    });
    this.searchMarker = L.marker([loc.lat, loc.lng], { icon: searchIcon, zIndexOffset: 1000 }).addTo(this.map);
    const popup = L.popup({ className: 'geo-popup', maxWidth: 340 }).setContent(
      this.buildPopup({ name: loc.name, category: loc.category || '', color: loc.color || '#ef4444', properties: loc })
    );
    this.searchMarker.bindPopup(popup).openPopup();
  }

  private loadHeatmaps() {
    this.clearHeatmaps();
    this.heatmapCategories.forEach(category => {
      this.api.getHeatmapData(category).subscribe({
        next: (datasets) => {
          if (Array.isArray(datasets)) {
            datasets.forEach(dataset => {
              if (dataset.geojson && dataset.geojson.features) {
                this.renderHeatmapGeoJSON(category, dataset.geojson.features, dataset.style);
              }
            });
          }
        },
        error: (err) => console.error(`Failed to load heatmap for ${category}`, err)
      });
    });
  }

  private renderHeatmapGeoJSON(category: string, features: any[], style: any) {
    const color = style.color || '#1D4ED8';
    const size = style.size || 8;
    const opacity = style.opacity || 0.8;
    const shape = style.shape || 'circle';
    
    features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;
      
      const shapeHtml = this.getShapeHtml(shape, color, size, opacity);
      
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: shapeHtml,
        iconSize: [size * 2 + 5, size * 2 + 5],
        iconAnchor: [(size * 2 + 5) / 2, (size * 2 + 5) / 2]
      });
      
      const marker = L.marker([coords[1], coords[0]], { icon }).addTo(this.map);
      const popup = L.popup({ className: 'geo-popup', maxWidth: 340 }).setContent(
        this.buildPopup({ name: props.name || 'Unknown', category, color, properties: props })
      );
      marker.bindPopup(popup);
      marker.on('mouseover', () => marker.openPopup());
      
      const layer = marker as any;
      this.heatmapLayers.push({ category, layer, type: 'gpkg' });
    });
  }

  private getShapeHtml(shape: string, color: string, size: number, opacity: number): string {
    const baseSize = size * 2;
    switch (shape.toLowerCase()) {
      case 'circle':
        return `<div style="background-color:${color};width:${baseSize}px;height:${baseSize}px;border-radius:50%;border:2.5px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3);opacity:${opacity}"></div>`;
      case 'square':
        return `<div style="background-color:${color};width:${baseSize}px;height:${baseSize}px;border:2.5px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3);opacity:${opacity}"></div>`;
      case 'triangle':
        return `<div style="width:0;height:0;border-left:${baseSize/2}px solid transparent;border-right:${baseSize/2}px solid transparent;border-bottom:${baseSize}px solid ${color};filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));opacity:${opacity}"></div>`;
      default:
        return `<div style="background-color:${color};width:${baseSize}px;height:${baseSize}px;border-radius:50%;border:2.5px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3);opacity:${opacity}"></div>`;
    }
  }

  private clearHeatmaps() {
    this.heatmapLayers.forEach(hl => {
      if (this.map.hasLayer(hl.layer)) {
        this.map.removeLayer(hl.layer);
      }
    });
    this.heatmapLayers = [];
  }
}
