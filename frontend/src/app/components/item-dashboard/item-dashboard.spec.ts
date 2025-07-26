import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemDashboard } from './item-dashboard';

describe('ItemDashboard', () => {
  let component: ItemDashboard;
  let fixture: ComponentFixture<ItemDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
