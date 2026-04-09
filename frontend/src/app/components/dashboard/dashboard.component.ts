import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MapViewComponent } from '../map-view/map-view.component';
import { InsightsPanelComponent } from '../insights-panel/insights-panel.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, MapViewComponent, InsightsPanelComponent],
  template: `
    <div class="flex flex-col h-screen w-full bg-background overflow-hidden text-on-surface">
      
      <header class="h-[68px] bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between px-6 z-20 shadow-sm flex-shrink-0">
         <div class="flex items-center gap-4">
            <button (click)="toggleSidebar()" class="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-container-high transition-colors">
              <svg class="w-5 h-5 text-on-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div class="font-manrope font-bold text-primary text-[13px] flex items-center gap-2">
              <span class="text-on-surface-variant hover:text-primary cursor-pointer transition-colors">Dashboard</span>
              <span class="text-on-surface-variant/50 text-xs">/</span>
              <span>Overview</span>
            </div>
         </div>
         <div class="flex items-center gap-6">
            <button class="flex items-center gap-2 text-[13px] font-manrope font-bold tracking-wide text-on-surface-variant hover:text-primary transition-colors">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
               Share
            </button>
            <button class="flex items-center gap-2 text-[13px] font-manrope font-bold tracking-wide text-on-surface-variant hover:text-primary transition-colors">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
               Settings
            </button>
            <div class="h-6 w-px bg-outline-variant/50 mx-2"></div>
            <button class="flex items-center gap-3 hover:bg-surface-container-low p-1.5 pr-4 rounded-full transition-colors cursor-pointer text-left">
              <div class="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-primary-fixed/50">JD</div>
              <div class="hidden md:block">
                <p class="text-[13px] font-bold text-on-surface leading-tight font-manrope">Jane Doe</p>
                <p class="text-[10px] text-on-surface-variant uppercase tracking-widest font-extrabold mt-0.5">Data Analyst</p>
              </div>
            </button>
         </div>
      </header>

      <div class="flex flex-1 overflow-hidden relative" [ngClass]="{'pointer-events-none': modalActive}">
        <app-sidebar [ngClass]="{'translate-x-0': sidebarOpen, '-translate-x-full': !sidebarOpen, 'invisible': modalActive}" 
                     [ngStyle]="{'width': sidebarWidth + 'px'}"
                     class="flex-shrink-0 z-10 transition-transform duration-300 md:translate-x-0 absolute md:relative h-full"
                     (categoriesSelected)="onCategoriesChange($event)" 
                     (boundarySelected)="onBoundaryChange($event)"
                     (citySelected)="onCityChange($event)"
                     (searchLocationSelected)="onSearchLocationSelected($event)"></app-sidebar>
        
        <div (mousedown)="startResize($event)" 
             [ngClass]="{'invisible': modalActive}"
             class="hidden md:block w-1 bg-outline-variant/20 hover:bg-primary hover:w-1.5 cursor-col-resize transition-all z-30 relative group">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-surface-container-lowest border border-outline-variant/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md">
            <svg class="w-3 h-3 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
          </div>
        </div>
        
        <app-map-view class="flex-1 relative z-0 w-full md:w-[calc(100%-520px)]" 
                      [ngClass]="{'invisible': modalActive}"
                      [categories]="currentCategories" 
                      [boundary]="currentBoundary"
                      [cityPincodes]="currentCityPincodes"
                      [usePerungudiFile]="currentUsePerungudiFile"
                      [searchLocation]="currentSearchLocation"
                      [showHeatmaps]="showHeatmaps"
                      [heatmapCategories]="heatmapCategories"></app-map-view>
        
        <app-insights-panel class="w-full md:w-[520px] flex-shrink-0 z-10 shadow-soft" 
                            [categories]="currentCategories" 
                            [boundary]="currentBoundary"
                            [cityPincodes]="currentCityPincodes"
                            [usePerungudiFile]="currentUsePerungudiFile"
                            (insightsRequested)="onInsightsRequested($event)"
                            (modalStateChange)="onModalStateChange($event)"></app-insights-panel>
      </div>
    </div>
  `
})
export class DashboardComponent {
  currentCategories: string[] = ['atm_location'];
  currentBoundary: string | null = null;
  currentCityPincodes: string[] = [];
  currentUsePerungudiFile = false;
  currentSearchLocation: any = null;
  showHeatmaps = false;
  heatmapCategories: string[] = [];
  sidebarWidth = 280;
  sidebarOpen = false;
  modalActive = false;
  private isResizing = false;

  onCategoriesChange(categories: string[]) {
    this.currentCategories = categories;
    this.currentSearchLocation = null;
  }

  onBoundaryChange(boundary: string | null) {
    this.currentBoundary = boundary;
    this.currentCityPincodes = [];
    this.currentUsePerungudiFile = false;
    this.currentSearchLocation = null;
  }

  onCityChange(event: { pincodes: string[]; usePerungudiFile: boolean }) {
    this.currentCityPincodes = event.pincodes;
    this.currentUsePerungudiFile = event.usePerungudiFile;
    this.currentBoundary = null;
    this.currentSearchLocation = null;
  }

  onSearchLocationSelected(location: any) {
    this.currentSearchLocation = location;
  }

  onInsightsRequested(categories: string[]) {
    this.showHeatmaps = true;
    this.heatmapCategories = [...categories];
  }

  onModalStateChange(isOpen: boolean) {
    this.modalActive = isOpen;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  startResize(event: MouseEvent) {
    this.isResizing = true;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizing) return;
    const newWidth = event.clientX;
    if (newWidth >= 240 && newWidth <= 500) {
      this.sidebarWidth = newWidth;
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isResizing = false;
  }
}
