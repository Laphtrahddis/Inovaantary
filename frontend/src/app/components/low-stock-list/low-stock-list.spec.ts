import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LowStockList } from './low-stock-list';

describe('LowStockList', () => {
  let component: LowStockList;
  let fixture: ComponentFixture<LowStockList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LowStockList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LowStockList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
