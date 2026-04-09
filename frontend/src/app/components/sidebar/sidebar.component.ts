import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full bg-surface-container-low border-r border-outline-variant/20 flex flex-col p-6 shadow-soft relative z-20">

      <!-- Logo -->
      <div class="mb-6 flex items-center gap-3 flex-shrink-0">
        <div class="w-8 h-8 bg-gradient-to-br from-primary to-primary-container rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <div>
          <h1 class="text-[17px] font-manrope font-bold text-primary mb-0 leading-tight">{{ websiteName }}</h1>
          <p class="text-[11px] font-inter text-on-surface-variant tracking-wide uppercase">Intelligence</p>
        </div>
      </div>

      <!-- Location Search -->
      <div class="px-2 mb-4 relative flex-shrink-0">
        <div class="relative">
          <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" placeholder="Search category locations..."
                 class="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-2 pl-9 pr-4 text-[13px] font-inter text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/70"
                 [value]="searchQuery" (input)="onSearchInput($event)">
        </div>
        <div *ngIf="searchResults.length > 0 && showSearchResults"
             class="absolute left-2 right-2 top-full mt-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] z-50 max-h-[200px] overflow-y-auto">
          <button *ngFor="let result of searchResults" (click)="selectSearchResult(result)"
                  class="w-full text-left px-4 py-2 hover:bg-surface-container flex flex-col border-b border-outline-variant/10 last:border-0">
            <span class="text-[13px] font-inter font-bold text-on-surface truncate">{{ result.name }}</span>
            <span class="text-[10px] uppercase tracking-wider font-extrabold text-primary bg-primary/10 px-1.5 rounded mt-0.5 self-start">{{ result.categoryName || result.category }}</span>
          </button>
        </div>
        <div *ngIf="isSearching" class="absolute right-4 top-1/2 -translate-y-1/2">
          <span class="flex h-3 w-3 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>
      </div>

      <nav class="flex-grow flex flex-col gap-1 overflow-y-auto pr-1 pb-4">

        <!-- BOUNDARY heading -->
        <div class="uppercase text-[11px] font-extrabold text-on-surface-variant tracking-widest mb-2 pl-2 flex items-center gap-2">
          <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
          Boundary
        </div>

        <!-- Area search BELOW boundary heading -->
        <div class="relative mb-2 px-1">
          <svg class="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <input type="text" placeholder="Search area / city..."
                 class="w-full bg-surface-container-high border border-outline-variant/30 rounded-lg py-1.5 pl-8 pr-7 text-[12px] font-inter text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/60"
                 [value]="areaSearchQuery" (input)="onAreaSearchInput($event)">
          <button *ngIf="areaSearchQuery" (click)="clearAreaSearch()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- City list: default 4, or search results -->
        <div class="flex flex-col gap-0.5 mb-1">
          <ng-container *ngFor="let city of visibleCities">
            <div>
              <!-- City row — name only, no pincode count -->
              <button (click)="selectCity(city)"
                      class="flex items-center justify-between text-left w-full px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group"
                      [ngClass]="activeCity?.id === city.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'">
                <div class="flex items-center gap-2">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  <span class="font-manrope font-semibold text-[13px]">{{ city.name }}</span>
                </div>
                <!-- Chevron for cities with pincodes -->
                <svg *ngIf="city.pincodes && city.pincodes.length > 0"
                     class="w-3.5 h-3.5 transition-transform duration-200"
                     [ngClass]="expandedCityId === city.id ? 'rotate-180 text-primary' : 'text-on-surface-variant'"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <!-- Pincode sub-list: only visible when this city is expanded -->
              <div class="overflow-hidden transition-all duration-300 ease-in-out"
                   [ngStyle]="{'max-height': expandedCityId === city.id ? '260px' : '0px',
                               'opacity':    expandedCityId === city.id ? '1' : '0'}">
                <div class="overflow-y-auto max-h-[250px] flex flex-col gap-0.5 pl-5 pr-2 pt-1 pb-2 border-l-2 border-primary/20 ml-4 mt-0.5">
                  <button *ngFor="let pc of city.pincodes" (click)="selectPincode(pc.pincode, $event)"
                          class="flex items-center text-left w-full px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer text-[12px]"
                          [ngClass]="activePincode === pc.pincode
                            ? 'bg-primary-fixed/50 text-primary font-semibold border-r-2 border-primary'
                            : 'hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'">
                    <span class="w-1.5 h-1.5 rounded-full bg-current mr-2 flex-shrink-0 opacity-60"></span>
                    <span class="font-inter font-medium truncate">{{ pc.pincode }} – {{ pc.name }}</span>
                  </button>
                </div>
              </div>
            </div>
          </ng-container>

          <div *ngIf="areaSearchQuery && visibleCities.length === 0"
               class="text-center py-3 text-on-surface-variant text-[12px] font-inter">
            No areas found for "{{ areaSearchQuery }}"
          </div>
        </div>

        <!-- DATA CATEGORIES -->
        <div class="uppercase text-[11px] font-extrabold text-on-surface-variant tracking-widest mb-2 mt-3 pl-2 flex items-center gap-2">
          <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          Data Categories
        </div>

        <div *ngIf="categoriesLoading" class="text-center py-4 text-on-surface-variant text-[13px]">Loading...</div>

        <ng-container *ngFor="let group of categoryGroups">
          <div class="mb-1">
            <button (click)="group.expanded = !group.expanded"
                    class="flex items-center justify-between text-left w-full px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high group">
              <span class="font-manrope font-bold text-[11px] text-on-surface tracking-wide uppercase">{{ group.name }}</span>
              <svg class="w-3.5 h-3.5 transition-transform duration-300 opacity-60 group-hover:opacity-100"
                   [ngClass]="group.expanded ? 'rotate-180 text-primary' : 'text-on-surface-variant'"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div class="overflow-hidden transition-all duration-300 ease-in-out"
                 [ngStyle]="{'max-height': group.expanded ? '600px' : '0px', 'opacity': group.expanded ? '1' : '0'}">
              <div class="flex flex-col gap-0.5 pl-3 pr-2 pt-0.5 pb-1 border-l-2 border-outline-variant/30 ml-5 mt-0.5">
                <label *ngFor="let cat of group.categories"
                       class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors">
                  <input type="checkbox" [checked]="selectedCategories.has(cat.id)"
                         (change)="toggleCategory(cat.id)"
                         class="w-3.5 h-3.5 rounded cursor-pointer flex-shrink-0" [style.accent-color]="cat.color">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background-color]="cat.color"></span>
                  <span class="font-inter text-[12px] font-medium text-on-surface truncate">{{ cat.icon }} {{ cat.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- Export -->
        <div class="mt-3 mb-2 border-t border-outline-variant/20 pt-3">
          <button class="flex items-center text-left w-full px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer bg-blue-500 text-white hover:bg-blue-800">
            <svg class="w-4 h-4 mr-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
            <span class="font-manrope font-semibold text-[13px] tracking-wide uppercase">Export Intelligence</span>
          </button>
        </div>
      </nav>

      <div class="mt-auto pt-3 flex flex-col gap-1 flex-shrink-0">
        <button class="flex items-center text-left w-full px-3 py-2 rounded-lg transition-colors duration-200 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-[13px] font-semibold">
          <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Help Center
        </button>
        <button class="flex items-center text-left w-full px-3 py-2 rounded-lg transition-colors duration-200 text-on-surface-variant hover:text-red-700 hover:bg-red-50 text-[13px] font-semibold">
          <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Logout
        </button>
      </div>
    </div>
  `
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() websiteName = 'BankCorp Geo';
  @Output() categoriesSelected = new EventEmitter<string[]>();
  @Output() boundarySelected = new EventEmitter<string | null>();
  @Output() citySelected = new EventEmitter<{ pincodes: string[]; usePerungudiFile: boolean }>();
  @Output() searchLocationSelected = new EventEmitter<any>();

  allCities: any[] = [];
  defaultCityIds = ['perungudi'];
  visibleCities: any[] = [];

  activeCity: any = null;
  activePincode: string | null = null;
  expandedCityId: string | null = null;

  areaSearchQuery = '';
  private areaSearchSubject = new Subject<string>();
  private areaSearchSub!: Subscription;

  categoryGroups: { name: string; expanded: boolean; categories: any[] }[] = [];
  categoriesLoading = true;
  selectedCategories = new Set<string>(['atm_location']);

  searchQuery = '';
  searchResults: any[] = [];
  showSearchResults = false;
  isSearching = false;
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCityAreas().subscribe({
      next: (cities) => {
        this.allCities = cities;
        const perungudi = cities.find((c: any) => c.id === 'perungudi');
        const dummyCities = [
          { id: 'chennai_north', name: 'Chennai North', pincodes: [] },
          { id: 'chennai_south', name: 'Chennai South', pincodes: [] },
          { id: 'chennai_central', name: 'Chennai Central', pincodes: [] }
        ];
        this.visibleCities = perungudi ? [perungudi, ...dummyCities] : dummyCities;
        if (perungudi) {
          this.activeCity = perungudi;
          this.expandedCityId = null;
          this.citySelected.emit({ pincodes: perungudi.pincodes.map((p: any) => p.pincode), usePerungudiFile: true });
        }
      },
      error: (err) => console.error('Could not fetch city areas', err)
    });

    this.areaSearchSub = this.areaSearchSubject.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(q => {
      if (!q.trim()) {
        const perungudi = this.allCities.find((c: any) => c.id === 'perungudi');
        const dummyCities = [
          { id: 'chennai_north', name: 'Chennai North', pincodes: [] },
          { id: 'chennai_south', name: 'Chennai South', pincodes: [] },
          { id: 'chennai_central', name: 'Chennai Central', pincodes: [] }
        ];
        this.visibleCities = perungudi ? [perungudi, ...dummyCities] : dummyCities;
      } else {
        this.visibleCities = this.allCities.filter((c: any) =>
          c.name.toLowerCase().includes(q.toLowerCase())
        );
      }
    });

    this.api.getCategories().subscribe({
      next: (cats) => {
        const groupMap = new Map<string, any[]>();
        for (const cat of cats) {
          const g = cat.group || 'Other';
          if (!groupMap.has(g)) groupMap.set(g, []);
          groupMap.get(g)!.push(cat);
        }
        this.categoryGroups = Array.from(groupMap.entries()).map(([name, categories]) => ({
          name, expanded: name === 'Banking', categories
        }));
        this.categoriesLoading = false;
      },
      error: (err) => { console.error('Could not fetch categories', err); this.categoriesLoading = false; }
    });

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.length < 2) {
        this.searchResults = []; this.showSearchResults = false; this.isSearching = false; return;
      }
      this.isSearching = true;
      this.api.searchLocations(query).subscribe({
        next: (results) => { this.searchResults = results; this.showSearchResults = true; this.isSearching = false; },
        error: () => { this.searchResults = []; this.showSearchResults = false; this.isSearching = false; }
      });
    });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
    this.areaSearchSub?.unsubscribe();
  }

  onAreaSearchInput(event: any) {
    this.areaSearchQuery = event.target.value;
    this.areaSearchSubject.next(this.areaSearchQuery);
  }

  clearAreaSearch() {
    this.areaSearchQuery = '';
    const perungudi = this.allCities.find((c: any) => c.id === 'perungudi');
    const dummyCities = [
      { id: 'chennai_north', name: 'Chennai North', pincodes: [] },
      { id: 'chennai_south', name: 'Chennai South', pincodes: [] },
      { id: 'chennai_central', name: 'Chennai Central', pincodes: [] }
    ];
    this.visibleCities = perungudi ? [perungudi, ...dummyCities] : dummyCities;
  }

  selectCity(city: any) {
    const wasPerungudi = this.activeCity?.id === 'perungudi';
    const isPerungudi = city.id === 'perungudi';
    
    this.activeCity = city;
    this.activePincode = null;
    
    if (this.expandedCityId === city.id) {
      this.expandedCityId = null;
    } else {
      this.expandedCityId = city.id;
    }
    
    const useFile = isPerungudi;
    
    if (isPerungudi && wasPerungudi) {
      this.citySelected.emit({ pincodes: [...city.pincodes.map((p: any) => p.pincode)], usePerungudiFile: useFile });
    } else {
      this.citySelected.emit({ pincodes: city.pincodes.map((p: any) => p.pincode), usePerungudiFile: useFile });
    }
    this.boundarySelected.emit(null);
  }

  selectPincode(pincode: string, event: Event) {
    event.stopPropagation();
    if (this.activePincode === pincode) {
      this.activePincode = null;
      if (this.activeCity) {
        const useFile = this.activeCity.id === 'perungudi';
        this.citySelected.emit({ pincodes: this.activeCity.pincodes.map((p: any) => p.pincode), usePerungudiFile: useFile });
        this.boundarySelected.emit(null);
      }
    } else {
      this.activePincode = pincode;
      this.citySelected.emit({ pincodes: [], usePerungudiFile: false });
      this.boundarySelected.emit(pincode);
    }
  }

  onSearchInput(event: any) {
    this.searchQuery = event.target.value;
    if (!this.searchQuery.trim()) { this.searchResults = []; this.showSearchResults = false; return; }
    this.searchSubject.next(this.searchQuery);
  }

  selectSearchResult(result: any) {
    this.searchQuery = result.name;
    this.showSearchResults = false;
    this.searchLocationSelected.emit(result);
  }

  toggleCategory(id: string) {
    if (this.selectedCategories.has(id)) {
      this.selectedCategories.delete(id);
    } else {
      this.selectedCategories.add(id);
    }
    this.categoriesSelected.emit(Array.from(this.selectedCategories));
  }
}
