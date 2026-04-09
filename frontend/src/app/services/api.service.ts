import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) { }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/categories`);
  }

  getCityAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/boundaries/city-areas`);
  }

  searchCityAreas(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/boundaries/city-areas/search?q=${encodeURIComponent(query)}`);
  }

  getPerungudiGeoJSON(): Observable<any> {
    return this.http.get(`${this.baseUrl}/boundaries/perungudi`);
  }

  getCategoryData(categories: string[], pincode?: string | null): Observable<any> {
    let url = `${this.baseUrl}/category-data?categories=${categories.join(',')}`;
    if (pincode) url += `&pincode=${encodeURIComponent(pincode)}`;
    return this.http.get(url);
  }

  getInsights(area: string, boundary?: string | null): Observable<any> {
    let url = `${this.baseUrl}/insights?area=${area}`;
    if (boundary) url += `&boundary=${boundary}`;
    return this.http.get(url);
  }

  getPincodeBoundaries(): Observable<any> {
    return this.http.get(`${this.baseUrl}/boundaries/pincode`);
  }

  getStreetBoundaries(pincode: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/boundaries/street?pincode=${encodeURIComponent(pincode)}`);
  }

  searchLocations(query: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
  }

  getHeatmapData(category: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/insights/heatmap/${category}`);
  }

  getCategoryInsights(category: string, boundary?: string | null): Observable<any> {
    let url = `${this.baseUrl}/insights/category/${category}`;
    if (boundary) url += `?boundary=${boundary}`;
    return this.http.get(url);
  }

  getCompareInsights(categories: string[], boundary?: string | null): Observable<any> {
    return this.http.post(`${this.baseUrl}/insights/compare`, {
      categories: categories,
      boundary: boundary || ''
    });
  }

  getMultiCategoryPincodeData(categories: string[], boundary?: string | null): Observable<any> {
    return this.http.post(`${this.baseUrl}/insights/compare`, {
      categories: categories,
      boundary: boundary || ''
    });
  }

  getCorrelationData(categories: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/correlation/data`, { categories });
  }
}
