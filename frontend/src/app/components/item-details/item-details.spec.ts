import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemDetails } from './item-details';

describe('ItemDetails', () => {
  let component: ItemDetails;
  let fixture: ComponentFixture<ItemDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
