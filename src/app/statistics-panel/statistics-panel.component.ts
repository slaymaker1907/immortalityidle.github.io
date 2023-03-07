import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AchievementService } from '../game-state/achievement.service';
import { ActivityService } from '../game-state/activity.service';
import { BattleService } from '../game-state/battle.service';
import { CharacterService } from '../game-state/character.service';
import { FollowersService } from '../game-state/followers.service';
import { HomeService } from '../game-state/home.service';
import { InventoryService } from '../game-state/inventory.service';
import { MainLoopService } from '../game-state/main-loop.service';
import { StoreService } from '../game-state/store.service';
import { map as rxjsMap, throttleTime } from 'rxjs/operators';

@Component({
  selector: 'app-statistics-panel',
  templateUrl: './statistics-panel.component.html',
  styleUrls: ['./statistics-panel.component.less']
})
export class StatisticsPanelComponent implements OnInit {

  daysPerSecond = 0;
  lastTimestamp = new Date().getTime();
  lastTickTotal = 0;
  constructor(
    public mainLoopService: MainLoopService,
    public storeService: StoreService,
    public inventoryService: InventoryService,
    public homeService: HomeService,
    public followerService: FollowersService,
    public characterService: CharacterService,
    public battleService: BattleService,
    public activityService: ActivityService,
    public achievementService: AchievementService
  ) { 
    this.lastTickTotal = mainLoopService.totalTicks;
    const daysPerSecond$ = this.mainLoopService.longTickSubject.pipe(throttleTime(5000), rxjsMap(() => {
      const currentTimestamp = new Date().getTime();
      const timeDiff = (currentTimestamp - this.lastTimestamp) / 1000;
      const tickDiff = this.mainLoopService.totalTicks - this.lastTickTotal;
      this.lastTickTotal = this.mainLoopService.totalTicks;
      this.lastTimestamp = currentTimestamp;
      if (timeDiff != 0){
        return tickDiff / timeDiff;
      } else {
        return 0;
      }
    }));
    daysPerSecond$.subscribe(newDaysPerSecond => {
      this.daysPerSecond = newDaysPerSecond
    });
  }

  ngOnInit(): void {
  }

}
