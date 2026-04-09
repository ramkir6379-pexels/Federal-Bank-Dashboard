import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsightsPanelComponent } from './insights-panel.component';

describe('InsightsPanelComponent', () => {
  let component: InsightsPanelComponent;
  let fixture: ComponentFixture<InsightsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsightsPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InsightsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
