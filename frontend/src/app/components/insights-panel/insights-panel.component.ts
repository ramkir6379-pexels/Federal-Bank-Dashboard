import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface CategoryOption {
  id: string;
  name: string;
  selected: boolean;
}

interface PincodeRow {
  pincode: string;
  city_name: string;
  [key: string]: any;
}

interface TotalRow {
  data_category: string;
  total_count: number;
}

interface CorrelationSummary {
  pincode: string;
  display_text: string;
}

interface CorrelationDetail {
  id: number;
  title: string;
  pincode: string;
  priority: string;
  priority_color: string;
  score: number;
  metric: string;
  insight: string;
  revenue: string;
  revenue_label?: string;
  action: string;
  products: string[];
  decision: string;
  edge: string;
  risk_mitigation?: string;
}

interface CorrelationData {
  correlation_id: string;
  correlation_name: string;
  summary_insights: CorrelationSummary[];
  expanded_view_details: CorrelationDetail[];
}

@Component({
  selector: 'app-insights-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full bg-surface-container-lowest border-l border-outline-variant/20 flex flex-col relative z-20 overflow-y-auto w-full" [ngClass]="{'max-w-full': tableExpanded}">
      <div class="p-6 pb-4 sticky top-0 bg-surface-container-lowest z-10 border-b border-outline-variant/10 shadow-sm">
        <h2 class="text-2xl font-manrope font-bold text-primary mb-1">Insights</h2>
        <p class="text-[13px] font-inter text-on-surface-variant flex items-center justify-between mb-3">
          <span class="capitalize">{{ getCategoryDisplay() }} Analytics <span class="uppercase tracking-widest text-[#006c49] font-bold text-[10px] bg-[#6cf8bb]/20 px-1.5 py-0.5 ml-1 rounded" *ngIf="boundary">{{boundary}}</span></span>
          <span *ngIf="loading" class="animate-pulse text-primary font-semibold text-[10px] bg-primary-fixed/50 px-2 py-1 rounded-full uppercase tracking-widest">Syncing</span>
        </p>

        <!-- Mode Toggle Buttons -->
        <div class="flex gap-2 mb-4">
          <button (click)="setMode('insights')"
                  [ngClass]="mode === 'insights' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'"
                  class="flex-1 rounded-lg py-2.5 px-4 text-[13px] font-bold tracking-wide hover:opacity-90 transition-all shadow-sm">
            Insights
          </button>
          <button (click)="setMode('compare')"
                  [ngClass]="mode === 'compare' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'"
                  class="flex-1 rounded-lg py-2.5 px-4 text-[13px] font-bold tracking-wide hover:opacity-90 transition-all shadow-sm">
            Compare (Multi Data)
          </button>
        </div>

        <!-- Show Insights Button (Insights Mode) -->
        <button *ngIf="mode === 'insights' && categories.length > 0 && !insightsActive"
                (click)="showInsights()"
                class="w-full bg-gradient-to-r from-primary to-primary-container text-white rounded-xl py-3 px-4 text-[13px] font-bold tracking-wide hover:opacity-90 transition-all shadow-md mb-4 flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          Show Insights
        </button>

        <!-- Metric Indicators (for insights mode when not active) -->
        <div *ngIf="mode === 'insights' && !insightsActive" class="flex gap-3 mb-4 transition-opacity duration-300" [class.opacity-50]="loading">
          <div class="flex-1 bg-primary-fixed/20 rounded-xl p-3 border border-primary/10 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-primary/80 tracking-wider mb-1">Density Index</span>
            <span class="text-lg font-manrope font-extrabold text-primary leading-none">{{ density }} <span class="text-[10px] font-medium opacity-80" *ngIf="densityDiff">{{densityDiff}}</span></span>
          </div>
          <div class="flex-1 bg-secondary-container/20 rounded-xl p-3 border border-secondary/10 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-secondary/80 tracking-wider mb-1">Cash Inflow</span>
            <span class="text-lg font-manrope font-extrabold text-secondary leading-none">{{ cashInflow }} <span class="text-[10px] font-medium opacity-80" *ngIf="cashDiff">{{cashDiff}}</span></span>
          </div>
        </div>
      </div>

      <div class="p-6 pt-2 flex flex-col gap-4">
        <!-- Compare Mode: Category Selection -->
        <ng-container *ngIf="mode === 'compare'">
          <!-- Dropdown Header -->
          <div class="bg-surface-container-high/50 rounded-2xl p-4 border border-outline-variant/20 shadow-sm cursor-pointer hover:bg-surface-container transition-colors" (click)="toggleMultiSelectDropdown()">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                <div class="text-[13px] font-inter font-medium text-on-surface">
                  {{ getSelectedCategories().length > 0 ? getSelectedCategories().length + ' Categories Selected' : 'Select Categories to Compare' }}
                </div>
              </div>
              <svg class="w-5 h-5 text-on-surface-variant transition-transform duration-200" [ngClass]="{'rotate-180': multiSelectDropdownOpen}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          <!-- Dropdown Content -->
          <div *ngIf="multiSelectDropdownOpen" class="bg-surface-container-high/50 rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
            <div class="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
              <label *ngFor="let cat of categoryOptions" 
                     class="flex items-center gap-3 bg-surface-container-lowest rounded-lg p-3 hover:bg-surface-container transition-colors border border-outline-variant/10 cursor-pointer">
                <input type="checkbox" 
                       [(ngModel)]="cat.selected"
                       (change)="onCategorySelectionChange()"
                       class="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary">
                <span class="text-[14px] font-inter font-medium text-on-surface">{{ cat.name }}</span>
              </label>
            </div>
            <button *ngIf="getSelectedCategories().length > 0"
                    (click)="loadCompareData()"
                    class="w-full mt-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl py-3 px-4 text-[13px] font-bold tracking-wide hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              Show Insights
            </button>
          </div>

          <!-- Total Count Table -->
          <div *ngIf="totalTableData.length > 0" class="bg-surface-container-high/50 rounded-2xl border border-outline-variant/20 shadow-sm">
            <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container transition-colors" (click)="toggleTotalTable()">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                <div class="text-[11px] uppercase font-extrabold text-on-surface-variant tracking-widest">Total Category Count</div>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="openMaximizeModal('table2'); $event.stopPropagation()" class="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                  <svg class="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                </button>
                <svg class="w-5 h-5 text-on-surface-variant transition-transform duration-200" [ngClass]="{'rotate-180': !totalTableCollapsed}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <div *ngIf="!totalTableCollapsed" class="p-5 pt-0 overflow-x-auto">
              <table class="w-full text-left table-fixed">
                <thead>
                  <tr class="border-b border-outline-variant/20">
                    <th class="py-3 px-4 text-[11px] uppercase font-extrabold text-on-surface-variant tracking-widest text-center">Data Category</th>
                    <th class="py-3 px-4 text-[11px] uppercase font-extrabold text-on-surface-variant tracking-widest text-center w-32">Total Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of totalTableData" class="border-b border-outline-variant/10 hover:bg-surface-container transition-colors">
                    <td class="py-3 px-4 text-[13px] font-inter font-medium text-on-surface text-center">{{ row.data_category }}</td>
                    <td class="py-3 px-4 text-[15px] font-manrope font-bold text-primary text-center">{{ row.total_count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Category-wise Pincode Distribution Table -->
          <div *ngIf="pincodeTableData.length > 0" class="bg-surface-container-high/50 rounded-2xl border border-outline-variant/20 shadow-sm">
            <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container transition-colors" (click)="togglePincodeTable()">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                <div class="text-[11px] uppercase font-extrabold text-on-surface-variant tracking-widest">Category-wise Pincode Distribution</div>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="openMaximizeModal('table1'); $event.stopPropagation()" class="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                  <svg class="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                </button>
                <svg class="w-5 h-5 text-on-surface-variant transition-transform duration-200" [ngClass]="{'rotate-180': !pincodeTableCollapsed}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <div *ngIf="!pincodeTableCollapsed" class="p-5 pt-0 overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-outline-variant/20">
                    <th class="py-3 px-4 text-[11px] uppercase font-extrabold text-on-surface-variant tracking-widest whitespace-nowrap">City (Pincode + Name)</th>
                    <th *ngFor="let catName of selectedCategoryNames" class="py-3 px-4 text-[10px] font-bold text-on-surface-variant tracking-wide text-center leading-tight">
                      <div class="whitespace-normal">{{ formatCategoryHeader(catName) }}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of pincodeTableData" class="border-b border-outline-variant/10 hover:bg-surface-container transition-colors">
                    <td class="py-3 px-4 text-[13px] font-inter text-align-center font-medium text-on-surface whitespace-nowrap">{{ row.pincode }} – {{ row.city_name }}</td>
                    <td *ngFor="let catName of selectedCategoryNames" class="py-3 px-4 text-[15px] font-manrope font-bold text-primary text-center">{{ row[catName] || 0 }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Multi-Category Opportunity Section -->
          <div *ngIf="pincodeTableData.length > 0 && multiOpportunityData.length > 0" class="bg-gradient-to-br from-secondary-container/20 to-secondary/10 rounded-2xl p-5 border border-secondary/20 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <div class="text-[11px] uppercase font-extrabold text-secondary/80 tracking-widest">Opportunity Analysis</div>
              </div>
              <button *ngIf="correlationData" (click)="openCorrelationGrid()" class="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                <svg class="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
              </button>
            </div>
            <div class="flex flex-col gap-3">
              <div *ngFor="let opportunity of multiOpportunityData" 
                   class="flex items-start gap-3 bg-surface-container-lowest/50 rounded-lg p-3 border border-secondary/10">
                <div class="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0"></div>
                <span class="text-[13px] font-inter text-on-surface leading-relaxed">{{ opportunity }}</span>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- Modal Overlay for Expanded Tables -->
         <div *ngIf="modalTable" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 animate-fadeIn" style="z-index: 9999;" (click)="closeModal()">
          <div class="bg-surface-container-lowest rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-scaleIn" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-outline-variant/20 bg-surface-container-high">
              <div class="flex items-center gap-3">
                <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path *ngIf="modalTable === 'table2'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  <path *ngIf="modalTable === 'table1'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <h3 class="text-xl font-manrope font-bold text-on-surface">
                  {{ modalTable === 'table2' ? 'Total Category Count' : 'Category-wise Pincode Distribution' }}
                </h3>
              </div>
              <button (click)="closeModal()" class="p-2 rounded-lg hover:bg-surface-container transition-colors">
                <svg class="w-6 h-6 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-6">
              <!-- Total Count Table Modal -->
              <div *ngIf="modalTable === 'table2' && totalTableData.length > 0">
                <div class="overflow-auto max-h-[calc(90vh-180px)]">
                  <table class="w-full text-left">
                    <thead class="sticky top-0 bg-surface-container-high z-10">
                      <tr class="border-b-2 border-primary/20">
                        <th class="py-4 px-6 text-[12px] uppercase font-extrabold text-on-surface-variant tracking-widest text-left">Data Category</th>
                        <th class="py-4 px-6 text-[12px] uppercase font-extrabold text-on-surface-variant tracking-widest text-right">Total Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let row of totalTableData; let i = index" 
                          class="border-b border-outline-variant/10 hover:bg-surface-container transition-colors"
                          [ngClass]="{'bg-surface-container/30': i % 2 === 0}">
                        <td class="py-4 px-6 text-[15px] font-inter font-medium text-on-surface text-left">{{ row.data_category }}</td>
                        <td class="py-4 px-6 text-[18px] font-manrope font-bold text-primary text-right">{{ row.total_count }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <!-- Pincode Distribution Table Modal -->
              <div *ngIf="modalTable === 'table1' && pincodeTableData.length > 0">
                <div class="overflow-auto max-h-[calc(90vh-180px)]">
                  <table class="w-full text-left">
                    <thead class="sticky top-0 bg-surface-container-high z-10">
                      <tr class="border-b-2 border-primary/20">
                        <th class="py-4 px-6 text-[12px] uppercase font-extrabold text-on-surface-variant tracking-widest whitespace-nowrap">City (Pincode + Name)</th>
                        <th *ngFor="let catName of selectedCategoryNames" class="py-4 px-6 text-[11px] font-bold text-on-surface-variant tracking-wide text-center leading-tight">
                          <div class="whitespace-normal">{{ formatCategoryHeader(catName) }}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let row of pincodeTableData; let i = index" 
                          class="border-b border-outline-variant/10 hover:bg-surface-container transition-colors"
                          [ngClass]="{'bg-surface-container/30': i % 2 === 0}">
                        <td class="py-4 px-6 text-[15px] font-inter font-medium text-on-surface whitespace-nowrap">{{ row.pincode }} – {{ row.city_name }}</td>
                        <td *ngFor="let catName of selectedCategoryNames" class="py-4 px-6 text-[18px] font-manrope font-bold text-primary text-right">{{ row[catName] || 0 }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Correlation Grid Modal -->
        <div *ngIf="showCorrelationGrid" class="fixed inset-0 flex items-center justify-center p-4" style="z-index: 10000; background-color: rgba(0, 0, 0, 0.7); pointer-events: auto;">
          <div class="bg-surface-container-lowest rounded-3xl shadow-2xl max-w-7xl w-full flex flex-col" style="height: 90vh; max-height: 90vh; position: relative; z-index: 10001; pointer-events: auto;">
            <!-- Modal Header (Fixed) -->
            <div class="flex items-center justify-between p-6 border-b border-outline-variant/20 bg-surface-container-high" style="flex-shrink: 0; position: relative; z-index: 10002;">
              <div class="flex items-center gap-3">
                <svg class="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <h3 class="text-xl font-manrope font-bold text-on-surface">Opportunity Analysis - Detailed View</h3>
              </div>
              <button (click)="closeCorrelationGrid()" type="button" class="p-2 rounded-lg hover:bg-surface-container transition-colors" style="position: relative; z-index: 10003; cursor: pointer; pointer-events: auto;">
                <svg class="w-6 h-6 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Content (Scrollable) -->
            <div class="p-6" style="flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div *ngFor="let item of correlationExpanded" 
                     class="bg-surface-container-high rounded-xl p-4 border border-outline-variant/20 hover:shadow-lg transition-all">
                  <div class="flex items-start justify-between mb-3">
                    <h4 class="text-[14px] font-manrope font-bold text-on-surface flex-1">{{ item.title }}</h4>
                    <span class="text-[18px] ml-2">{{ item.priority_color }}</span>
                  </div>
                  
                  <div class="space-y-2">
                    <div *ngIf="shouldShowField(item.pincode)" class="flex items-center gap-2">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Pincode:</span>
                      <span class="text-[13px] font-inter font-semibold text-primary">{{ item.pincode }}</span>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.priority)" class="flex items-center gap-2">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Priority:</span>
                      <span class="text-[13px] font-inter font-medium text-on-surface">{{ item.priority }}</span>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.score)" class="flex items-center gap-2">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Score:</span>
                      <span class="text-[13px] font-manrope font-bold text-secondary">{{ item.score }}</span>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.metric)" class="bg-primary/5 rounded-lg p-2 mt-2">
                      <span class="text-[10px] uppercase font-bold text-primary/70 tracking-wider block mb-1">Metric</span>
                      <span class="text-[12px] font-inter text-on-surface">{{ item.metric }}</span>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.insight)" class="mt-3">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Insight</span>
                      <p class="text-[12px] font-inter text-on-surface-variant leading-relaxed">{{ item.insight }}</p>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.revenue)" class="flex items-center gap-2 mt-2">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Revenue:</span>
                      <span class="text-[13px] font-manrope font-bold text-red-500">{{ item.revenue }}</span>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.action)" class="bg-secondary/5 rounded-lg p-2 mt-2">
                      <span class="text-[10px] uppercase font-bold text-secondary/70 tracking-wider block mb-1">Action</span>
                      <p class="text-[12px] font-inter text-on-surface">{{ item.action }}</p>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.products) && item.products.length > 0" class="mt-2">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Products</span>
                      <div class="flex flex-wrap gap-1">
                        <span *ngFor="let product of item.products" 
                              class="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {{ product }}
                        </span>
                      </div>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.edge)" class="mt-2">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Edge</span>
                      <p class="text-[12px] font-inter text-on-surface-variant">{{ item.edge }}</p>
                    </div>
                    
                    <div *ngIf="shouldShowField(item.decision)" class="flex items-center gap-2 mt-2">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Decision:</span>
                      <span class="text-[12px] font-inter font-semibold text-on-surface">{{ item.decision }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Insights Mode: Single Category Insights -->
        <ng-container *ngIf="mode === 'insights' && insightsActive && categoryInsightsData">
          <!-- Total Count Section -->
          <div class="bg-gradient-to-br from-primary/10 to-primary-container/20 rounded-2xl p-5 border border-primary/20 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              <div class="text-[11px] uppercase font-extrabold text-primary/80 tracking-widest">Total Count</div>
            </div>
            <div class="text-4xl font-manrope font-extrabold text-primary mb-2">{{ categoryInsightsData.total_count }}</div>
            <div class="text-[13px] font-inter font-medium text-on-surface-variant">{{ categoryInsightsData.category_name }} in {{ categoryInsightsData.boundary || 'All Areas' }}</div>
          </div>

          <!-- Pincode-wise Count Section -->
          <div class="bg-surface-container-high/50 rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <div class="text-[11px] uppercase font-extrabold text-on-surface-variant tracking-widest">Pincode-wise Breakdown</div>
            </div>
            <div class="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
              <div *ngFor="let item of categoryInsightsData.pincode_breakdown" 
                   class="flex items-center justify-between bg-surface-container-lowest rounded-xl p-3.5 hover:bg-surface-container transition-colors border border-outline-variant/10">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                  <span class="text-[14px] font-inter font-semibold text-on-surface">{{ item.pincode }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[16px] font-manrope font-extrabold text-primary">{{ item.count }}</span>
                  <span class="text-[11px] font-inter text-on-surface-variant">Count</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Opportunity Section -->
          <div *ngIf="correlationData && correlationSummary.length > 0" class="bg-gradient-to-br from-secondary-container/20 to-secondary/10 rounded-2xl p-5 border border-secondary/20 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <div class="text-[11px] uppercase font-extrabold text-secondary/80 tracking-widest">Opportunity Analysis</div>
              </div>
              <button (click)="openCorrelationGrid()" class="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                <svg class="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
              </button>
            </div>
            <div class="flex flex-col gap-3">
              <div *ngFor="let summary of correlationSummary" 
                   class="flex items-start gap-3 bg-surface-container-lowest/50 rounded-lg p-3 border border-secondary/10">
                <div class="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0"></div>
                <div class="flex-1">
                  <div class="text-[11px] font-bold text-primary mb-1">{{ summary.pincode }}</div>
                  <span class="text-[13px] font-inter text-on-surface leading-relaxed">{{ summary.display_text }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Opportunity Section (Fallback) -->
          <div *ngIf="!correlationData || correlationSummary.length === 0" class="bg-gradient-to-br from-secondary-container/20 to-secondary/10 rounded-2xl p-5 border border-secondary/20 shadow-sm">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <div class="text-[11px] uppercase font-extrabold text-secondary/80 tracking-widest">Opportunity Analysis</div>
            </div>
            <div class="flex flex-col gap-3">
              <div *ngFor="let opportunity of categoryInsightsData.opportunity_analysis" 
                   class="flex items-start gap-3 bg-surface-container-lowest/50 rounded-lg p-3 border border-secondary/10">
                <div class="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0"></div>
                <span class="text-[13px] font-inter text-on-surface leading-relaxed">{{ opportunity }}</span>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- Legend Section (when insights active for heatmap categories) -->
        <ng-container *ngIf="mode === 'insights' && insightsActive && activeLegend.length > 0">
          <div class="bg-surface-container-high/50 rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
              <div class="text-[11px] uppercase font-extrabold text-on-surface-variant tracking-widest">Active Layers</div>
            </div>
            <div class="flex flex-col gap-2.5">
              <div *ngFor="let item of activeLegend" class="flex items-center gap-3 bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/10">
                <div class="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" [style.background-color]="item.color">
                  <span class="text-white text-[11px] font-bold">{{ item.shape }}</span>
                </div>
                <span class="text-[13px] font-inter font-medium text-on-surface">{{ item.name }}</span>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- General Insights Cards -->
        <ng-container *ngIf="mode === 'insights' && !insightsActive && insights.length > 0">
          <div *ngFor="let insight of insights; let i = index" 
               class="rounded-2xl p-5 border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer relative overflow-hidden"
               [ngClass]="{'bg-primary-fixed/10 border-primary/20': i%2===0, 'bg-secondary-container/10 border-secondary/20': i%2===1}">
            <div class="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] opacity-10 transition-transform duration-500 scale-100 hover:scale-110"
                 [ngClass]="{'bg-primary': i%2===0, 'bg-secondary': i%2===1}"></div>
            <h3 class="font-manrope font-bold text-[15px] mb-2 relative z-10"
                [ngClass]="{'text-primary': i%2===0, 'text-secondary': i%2===1}">{{ insight.title }}</h3>
            <p class="font-inter text-[13px] text-on-surface-variant mb-4 leading-relaxed relative z-10">{{ insight.reason }}</p>
            <div class="pt-3 border-t relative z-10" [ngClass]="{'border-primary/10': i%2===0, 'border-secondary/10': i%2===1}">
              <span class="text-[10px] uppercase tracking-widest font-bold mb-1 block" [ngClass]="{'text-primary/70': i%2===0, 'text-secondary/80': i%2===1}">Recommendation</span>
              <p class="font-inter text-[13px] font-medium text-on-surface">{{ insight.action }}</p>
            </div>
            <button class="mt-5 w-full text-white rounded-lg py-2.5 text-[13px] font-bold tracking-wide hover:opacity-90 transition-all shadow-sm relative z-10"
                    [ngClass]="{'bg-gradient-to-r from-primary to-primary-container': i%2===0, 'bg-gradient-to-r from-secondary to-[#009b67]': i%2===1}">Take Action</button>
          </div>
        </ng-container>

        <!-- Empty State -->
        <div *ngIf="mode === 'insights' && !loading && !insightsActive && insights.length === 0" class="text-center py-12 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/50">
          <div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3">
             <svg class="w-6 h-6 text-on-surface-variant opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <p class="text-on-surface-variant text-[13px] font-semibold tracking-wide">Select a category to view insights</p>
        </div>
      </div>
    </div>
  `
})
export class InsightsPanelComponent implements OnChanges {
  @Input() categories: string[] = [];
  @Input() boundary: string | null = null;
  @Input() cityPincodes: string[] = [];
  @Input() usePerungudiFile = false;
  @Output() insightsRequested = new EventEmitter<string[]>();
  @Output() modalStateChange = new EventEmitter<boolean>();

  insights: any[] = [];
  loading = false;
  insightsActive = false;
  activeLegend: { name: string; color: string; shape: string }[] = [];
  density: string = '84.2';
  densityDiff: string = '+2.1%';
  cashInflow: string = '$1.2M';
  cashDiff: string = '+5%';
  categoryInsightsData: any = null;
  mode: 'insights' | 'compare' = 'insights';
  categoryOptions: CategoryOption[] = [];
  compareData: any[] = [];
  tableExpanded = false;
  pincodeTableData: PincodeRow[] = [];
  totalTableData: TotalRow[] = [];
  selectedCategoryNames: string[] = [];
  multiSelectCollapsed = false;
  table1Expanded = false;
  table2Expanded = false;
  modalTable: 'table1' | 'table2' | null = null;
  totalCountCollapsed = true;
  pincodeDistCollapsed = true;
  multiSelectDropdownOpen = false;
  totalTableCollapsed = true;
  pincodeTableCollapsed = true;
  multiOpportunityData: string[] = [];
  correlationData: CorrelationData | null = null;
  correlationSummary: CorrelationSummary[] = [];
  correlationExpanded: CorrelationDetail[] = [];
  showCorrelationGrid = false;

  constructor(private api: ApiService) {
    this.initializeCategoryOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categories']) {
      this.insightsActive = false;
      this.activeLegend = [];
      this.categoryInsightsData = null;
      this.compareData = [];
      this.pincodeTableData = [];
      this.totalTableData = [];
      this.selectedCategoryNames = [];
      this.multiSelectCollapsed = false;
      this.multiSelectDropdownOpen = false;
      this.totalTableCollapsed = true;
      this.pincodeTableCollapsed = true;
      this.multiOpportunityData = [];
      this.correlationData = null;
      this.correlationSummary = [];
      this.correlationExpanded = [];
      this.showCorrelationGrid = false;
    }
    if (changes['categories'] || changes['boundary'] || changes['usePerungudiFile'] || changes['cityPincodes']) {
      if (this.mode === 'insights') {
        this.loadInsights();
      }
    }
  }

  initializeCategoryOptions() {
    this.api.getCategories().subscribe({
      next: (categories: any) => {
        this.categoryOptions = categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          selected: false
        }));
      },
      error: (err: any) => console.error('Error loading categories', err)
    });
  }

  setMode(mode: 'insights' | 'compare') {
    this.mode = mode;
    this.insightsActive = false;
    this.categoryInsightsData = null;
    this.compareData = [];
    this.tableExpanded = false;
    this.pincodeTableData = [];
    this.totalTableData = [];
    this.selectedCategoryNames = [];
    this.multiSelectCollapsed = false;
    this.table1Expanded = false;
    this.table2Expanded = false;
    this.modalTable = null;
    this.multiSelectDropdownOpen = false;
    this.totalTableCollapsed = true;
    this.pincodeTableCollapsed = true;
    this.multiOpportunityData = [];
    this.correlationData = null;
    this.correlationSummary = [];
    this.correlationExpanded = [];
    this.showCorrelationGrid = false;

    if (mode === 'insights') {
      this.loadInsights();
    }
  }

  getCategoryDisplay(): string {
    if (this.categories.length === 0) return 'No Category';
    if (this.categories.length === 1) return this.categories[0].replace(/_/g, ' ');
    return `${this.categories.length} Categories`;
  }

  showInsights() {
    this.insightsActive = true;

    if (this.categories.length === 1) {
      this.loadCategoryInsights();
      this.loadCorrelationData(this.categories);
    } else {
      this.buildLegend();
      this.insightsRequested.emit(this.categories);
    }
  }

  private loadCategoryInsights() {
    this.loading = true;
    const category = this.categories[0];
    const boundaryName = this.boundary || (this.usePerungudiFile ? 'perungudi' : '');

    this.api.getCategoryInsights(category, boundaryName).subscribe({
      next: (data: any) => {
        this.categoryInsightsData = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading category insights', err);
        this.loading = false;
      }
    });
  }

  getSelectedCategories(): string[] {
    return this.categoryOptions.filter(cat => cat.selected).map(cat => cat.id);
  }

  onCategorySelectionChange() {
    // React to selection changes if needed
  }

  loadCompareData() {
    const selectedCategories = this.getSelectedCategories();
    if (selectedCategories.length === 0) return;

    this.loading = true;
    this.multiSelectDropdownOpen = false;
    const boundaryName = this.boundary || (this.usePerungudiFile ? 'perungudi' : '');

    // Always load correlation data for any category combination
    this.loadCorrelationData(selectedCategories);

    this.api.getMultiCategoryPincodeData(selectedCategories, boundaryName).subscribe({
      next: (response: any) => {
        this.pincodeTableData = response.pincode_table || [];
        this.totalTableData = response.total_table || [];
        this.selectedCategoryNames = response.categories || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading compare data', err);
        this.loading = false;
      }
    });
  }

  loadCorrelationData(categories: string[]) {
    this.api.getCorrelationData(categories).subscribe({
      next: (data: CorrelationData) => {
        if (data.summary_insights && data.summary_insights.length > 0) {
          this.correlationData = data;
          this.correlationSummary = data.summary_insights.slice(0, 3);
          this.correlationExpanded = data.expanded_view_details;
          this.multiOpportunityData = this.correlationSummary.map(s => s.display_text);
        } else {
          this.correlationData = null;
          this.correlationSummary = [];
          this.correlationExpanded = [];
          this.multiOpportunityData = [];
        }
      },
      error: (err: any) => {
        console.error('Error loading correlation data', err);
        this.correlationData = null;
        this.correlationSummary = [];
        this.correlationExpanded = [];
        this.multiOpportunityData = [];
      }
    });
  }

  openCorrelationGrid() {
    this.showCorrelationGrid = true;
    this.modalStateChange.emit(true);
  }

  closeCorrelationGrid() {
    this.showCorrelationGrid = false;
    this.modalStateChange.emit(false);
  }

  shouldShowField(value: any): boolean {
    return value !== 'N/A' && value !== null && value !== undefined && value !== '';
  }

  generateMultiOpportunityData() {
    this.multiOpportunityData = [
      'Balanced distribution across selected categories indicates stable market presence',
      'Growth potential identified in low-count areas for strategic expansion',
      'Cross-category synergies available for integrated service offerings'
    ];
  }

  toggleMultiSelect() {
    this.multiSelectCollapsed = !this.multiSelectCollapsed;
  }

  toggleMultiSelectDropdown() {
    this.multiSelectDropdownOpen = !this.multiSelectDropdownOpen;
  }

  toggleTotalTable() {
    this.totalTableCollapsed = !this.totalTableCollapsed;
  }

  togglePincodeTable() {
    this.pincodeTableCollapsed = !this.pincodeTableCollapsed;
  }

  toggleTable1Expand() {
    this.modalTable = this.modalTable === 'table1' ? null : 'table1';
  }

  toggleTable2Expand() {
    this.modalTable = this.modalTable === 'table2' ? null : 'table2';
  }

  openMaximizeModal(table: 'table1' | 'table2') {
    this.modalTable = table;
  }

  closeModal() {
    this.modalTable = null;
  }

  private buildLegend() {
    this.activeLegend = [];
    this.categories.forEach(cat => {
      this.api.getHeatmapData(cat).subscribe({
        next: (datasets: any) => {
          if (Array.isArray(datasets)) {
            datasets.forEach((dataset: any) => {
              const style = dataset.style || {};
              const color = style.color || this.getDefaultColor(cat);
              const shape = this.getShapeSymbol(style.shape || 'circle');
              const name = style.name || cat.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              this.activeLegend.push({
                name: name,
                color: color,
                shape: shape
              });
            });
          }
        },
        error: () => {
          this.activeLegend.push({
            name: cat.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            color: this.getDefaultColor(cat),
            shape: '●'
          });
        }
      });
    });
  }

  private getDefaultColor(category: string): string {
    const colorMap: { [key: string]: string } = {
      'atm_location': '#1D4ED8',
      'bank_branches': '#059669',
      'federal_bank_branches': '#DC2626'
    };
    return colorMap[category] || '#6B7280';
  }

  private getShapeSymbol(shape: string): string {
    const shapeMap: { [key: string]: string } = {
      'circle': '●',
      'square': '■',
      'triangle': '▲',
      'star': '★',
      'cross': '✕'
    };
    return shapeMap[shape.toLowerCase()] || '●';
  }

  private loadInsights() {
    this.loading = true;
    if (this.boundary) {
      this.density = (Math.random() * 50 + 40).toFixed(1);
      this.cashInflow = '$' + (Math.random() * 3 + 0.5).toFixed(1) + 'M';
    } else {
      this.density = '84.2';
      this.cashInflow = '$1.2M';
    }
    const category = this.categories[0] || 'atm';
    this.api.getInsights(category, this.boundary).subscribe({
      next: (res: any) => {
        this.insights = res.insights || [];
        setTimeout(() => { this.loading = false; }, 300);
      },
      error: (err: any) => {
        console.error('Error loading insights', err);
        this.loading = false;
      }
    });
  }

  formatCategoryHeader(catName: string): string {
    const formatted = catName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const words = formatted.split(' ');
    if (words.length === 1) return formatted;
    if (words.length === 2) return words.join('\n');
    const mid = Math.ceil(words.length / 2);
    return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
  }
}
