import { Injectable } from '@angular/core';
import { LogService } from '../log-panel/log.service';
import { CharacterService } from '../game-state/character.service';
import { InventoryService, Item } from '../game-state/inventory.service';
import { MainLoopService } from '../main-loop.service';
import { ReincarnationService } from '../reincarnation/reincarnation.service';
import { ItemRepoService } from '../game-state/item-repo.service';
import { formatNumber } from '@angular/common';

export interface Enemy {
  name: string,
  health: number,
  maxHealth: number,
  accuracy: number,
  attack: number,
  defense: number,
  loot: Item[]
};

export interface EnemyStack {
  enemy: Enemy,
  quantity: number
}

export interface BattleProperties {
  enemies: EnemyStack[],
  currentEnemy: EnemyStack | null,
  kills: number,
  troubleKills: number,
  autoTroubleUnlocked: boolean,
  autoTroubleEnabled: boolean,
  monthlyMonsterDay: number
}


@Injectable({
  providedIn: 'root'
})
export class BattleService {
  //TODO: add this to save/load functions

  enemies: EnemyStack[];
  currentEnemy: EnemyStack | null;
  kills: number;
  troubleKills: number;
  autoTroubleUnlocked: boolean = false;
  autoTroubleEnabled: boolean = false;
  yearlyMonsterDay: number;

  constructor(
    private logService: LogService,
    private characterService: CharacterService,
    private itemRepoService: ItemRepoService,
    private inventoryService: InventoryService,
    mainLoopService: MainLoopService,
    reincarnationService: ReincarnationService
  ) {
    this.enemies = [];
    this.currentEnemy = null;
    this.kills = 0;
    this.troubleKills = 0;
    this.yearlyMonsterDay = 0;

    mainLoopService.tickSubject.subscribe(() => {
      if (this.characterService.characterState.dead){
        return;
      }
      if (this.currentEnemy == null && this.enemies.length > 0){
        this.currentEnemy = this.enemies[0];
      }
      this.enemiesAttack();
      this.youAttack();
      this.yearlyMonsterDay++;
      if (this.yearlyMonsterDay >= 365){
        this.yearlyMonsterDay = 0;
        this.trouble();
      }
      if (this.autoTroubleEnabled){
        this.trouble();
      }
    });

    reincarnationService.reincarnateSubject.subscribe(() => {
      this.reset();
    });

  }

  reset(){
    this.enemies = [];
    this.currentEnemy = null;
    this.kills = 0;
    this.troubleKills = 0;
    this.yearlyMonsterDay = 0;
  }

  getProperties(): BattleProperties {
    return {
      enemies: this.enemies,
      currentEnemy: this.currentEnemy,
      kills: this.kills,
      troubleKills: this.troubleKills,
      autoTroubleUnlocked: this.autoTroubleUnlocked,
      autoTroubleEnabled: this.autoTroubleEnabled,
      monthlyMonsterDay: this.yearlyMonsterDay
    }
  }

  setProperties(properties: BattleProperties) {
    this.enemies = properties.enemies;
    this.currentEnemy = properties.currentEnemy;
    this.kills = properties.kills;
    this.troubleKills = properties.troubleKills;
    this.autoTroubleUnlocked = properties.autoTroubleUnlocked;
    this.autoTroubleEnabled = properties.autoTroubleEnabled;
    this.yearlyMonsterDay = properties.monthlyMonsterDay;
  }

  enemiesAttack(){
    for (const enemyStack of this.enemies){
      for (let i = 0; i < enemyStack.quantity; i++){
        if (Math.random() < enemyStack.enemy.accuracy){
          let damage = enemyStack.enemy.attack;
          damage = damage / (1 + this.characterService.characterState.defense * 0.1);
          this.logService.addLogMessage("Ow! " + enemyStack.enemy.name + " hit you for " + formatNumber(damage,"en-US", "1.0-2") + " damage", 'INJURY', 'COMBAT');
          this.characterService.characterState.status.health.value -= damage;
          this.characterService.characterState.increaseAttribute('toughness', 0.01);
        } else {
          this.logService.addLogMessage("Miss! " + enemyStack.enemy.name + " tries to hit you but fails.", 'STANDARD', 'COMBAT');
        }
      }
    }
  }

  youAttack(){
    if (this.currentEnemy){

      if (Math.random() > this.characterService.characterState.accuracy){
        this.logService.addLogMessage("You attack " + this.currentEnemy.enemy.name + " but miss.", 'STANDARD', 'COMBAT');
        return;
      }

      let damage = this.characterService.characterState.attackPower;
      damage = damage / (1 + this.currentEnemy.enemy.defense * 0.1);
      if (damage < 1){
        // pity damage
        damage = 1;
      }

      this.currentEnemy.enemy.health = Math.floor(this.currentEnemy.enemy.health - damage);
      // degrade weapon
      if (this.characterService.characterState.equipment.leftHand && this.characterService.characterState.equipment.leftHand.weaponStats){
        this.characterService.characterState.equipment.leftHand.weaponStats.durability--;
        this.inventoryService.updateWeaponDescription(this.characterService.characterState.equipment.leftHand);
        if (this.characterService.characterState.equipment.leftHand.weaponStats.durability <= 0){
          this.inventoryService.addItem(this.characterService.characterState.equipment.leftHand);
          this.characterService.characterState.equipment.leftHand = null;
        }
      }
      if (this.characterService.characterState.equipment.rightHand && this.characterService.characterState.equipment.rightHand.weaponStats){
        this.characterService.characterState.equipment.rightHand.weaponStats.durability--;
        this.inventoryService.updateWeaponDescription(this.characterService.characterState.equipment.rightHand);
        if (this.characterService.characterState.equipment.rightHand.weaponStats.durability <= 0){
          this.inventoryService.addItem(this.characterService.characterState.equipment.rightHand);
          this.characterService.characterState.equipment.rightHand = null;
        }
      }

      if (this.currentEnemy.enemy.health <= 0){
        this.kills++;
        this.logService.addLogMessage("You manage to kill " + this.currentEnemy.enemy.name, 'STANDARD', 'COMBAT');
        for (let item of this.currentEnemy.enemy.loot){
          this.inventoryService.addItem(item);
        }
        this.currentEnemy.quantity--;
        if (this.currentEnemy.quantity <= 0){
          let index = this.enemies.indexOf(this.currentEnemy);
          this.enemies.splice(index, 1);
          this.currentEnemy = null;
        } else {
          this.currentEnemy.enemy.health = this.currentEnemy.enemy.maxHealth;
        }
      } else {
        this.logService.addLogMessage("You attack " + this.currentEnemy.enemy.name + " for " + damage + " damage", 'STANDARD', 'COMBAT');
      }
    }
  }

  fight(enemyStack: EnemyStack){
    this.currentEnemy = enemyStack;
  }

  addEnemy(enemy: Enemy){
    this.logService.addLogMessage("A new enemy comes along to trouble your sleep: " + enemy.name, 'STANDARD', 'COMBAT');
    for (const enemyIterator of this.enemies) {
      if (enemyIterator.enemy.name == enemy.name) {
        // it matches an existing enemy, add it to the stack and bail out
        enemyIterator.quantity++;
        return;
      }
    }
    // it didn't match any, create a new enemyStack
    this.enemies.push({enemy: JSON.parse(JSON.stringify(enemy)), quantity: 1});
    if (this.currentEnemy == null){
      this.currentEnemy = this.enemies[0];
    }

  }

  // generate a monster based on current troubleKills
  trouble(){
    if (this.enemies.length != 0){
      return;
    }
    let rank = Math.floor(this.troubleKills / (this.monsterNames.length * this.monsterQualities.length));
    let index = this.troubleKills % (this.monsterNames.length * this.monsterQualities.length);
    let nameIndex = Math.floor(index / this.monsterQualities.length);
    let qualityIndex = index % this.monsterQualities.length;

    let monsterName = this.monsterQualities[qualityIndex] + " " + this.monsterNames[nameIndex];
    if (rank > 0){
      monsterName += " " + (rank + 1);
    }

    this.addEnemy({
      name: monsterName,
      health: this.troubleKills * 10,
      maxHealth: this.troubleKills * 10,
      accuracy: 0.5,
      attack: this.troubleKills / 5,
      defense: Math.floor(Math.log2(this.troubleKills)),
      loot: [this.inventoryService.generateSpiritGem(Math.floor(Math.log2(this.troubleKills + 2)))]
    });
    this.troubleKills++;
  }

  // Don't put items with use() functions in the loot (like food). They don't get persisted.
  enemyRepo = {
    mouse: {
      name: "a pesky mouse",
      health: 2,
      maxHealth: 2,
      accuracy: 0.03,
      attack: 0.3,
      defense: 0,
      loot: []
    },
    wolf: {
      name: "a hungry wolf",
      health: 20,
      maxHealth: 20,
      accuracy: 0.5,
      attack: 5,
      defense: 2,
      loot: [
        this.itemRepoService.items['hide']
      ]
    }
  }

  monsterNames = ["spider", "rat", "lizard", "snake", "imp", "jackalope", "goblin", "zombie", "hobgoblin",
    "basilisk", "mogwai", "gremlin", "orc", "tiger", "ghost", "troll", "manticore", "merlion",
    "bugbear", "yeti", "dreameater", "unicorn", "hellhound", "chimaera", "undine", "minotaur", "bunyip",
    "wyvern", "doomworm", "giant", "phoenix", "titan", "stormbringer"];

  monsterQualities = [
    "a pathetic", "an infant", "a sickly", "a wimpy", "a weak", "a tired", "a poor",
    "an average", "a healthy", "a big", "a tough", "a strong", "a mighty", "a powerful",
    "a dangerous", "a terrifying", "an abominable", "a demonic", "a diabolical", "an infernal"
  ];
}
