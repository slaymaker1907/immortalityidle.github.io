import { Component } from '@angular/core';
import { Character } from '../game-state/character';
import { CharacterService } from '../game-state/character.service';
import { HomeService } from '../game-state/home.service';
import { MatDialog } from '@angular/material/dialog';
import { StoreService } from '../game-state/store.service';
import { FurnitureStoreModalComponent } from '../furniture-store-modal/furniture-store-modal.component';

@Component({
  selector: 'app-home-panel',
  templateUrl: './home-panel.component.html',
  styleUrls: ['./home-panel.component.less', '../app.component.less']
})

export class HomePanelComponent {

  character: Character;

  constructor(public characterService: CharacterService,
    public homeService: HomeService,
    public dialog: MatDialog,
    private storeService: StoreService) {
    this.character = characterService.characterState;
  }

  upgradeClick(): void {
    this.homeService.upgradeToNextHome();
  }

  buyClick(): void {
    this.homeService.buyLand();
  }

  fieldClick(): void {
    this.homeService.addField();
  }

  storeClicked(): void {
    this.storeService.setStoreInventory();
    const dialogRef = this.dialog.open(FurnitureStoreModalComponent, {
      width: '500px',
      data: {someField: 'foo'}
    });
  }

}
