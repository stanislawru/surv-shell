import {Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter} from '@angular/core';
import {FormArray} from '@angular/forms';
import {debounceTime} from 'rxjs/operators';

import {FormServiceService} from '../../../../core/services/form-service.service';
import { SpecialItemModel, SpecialTaskModel } from '../../../../core/models/specialItem.model';
import { ParseToXmlService } from '../../../../core/services/parse-to-xml.service';
import { MainService } from '../../../../core/services/main.service';
import * as path from 'path';

import {SPECIAL_TASKS_DESCRIPTIONS} from '../../../../core/models/special-tasks-data';

@Component({
  selector: 'app-special-part',
  templateUrl: './special-part.component.html',
  styleUrls: ['./special-part.component.scss']
})
export class SpecialPartComponent implements OnInit, OnChanges {

  @Input() data: any;
  @Output() onTotalHoursChange = new EventEmitter<number>();
  form: FormArray;
  specialTaskDescriptions: {name: string, description: string}[];

  constructor(private formService: FormServiceService,
              private parseToXmlService: ParseToXmlService,
              private mainService: MainService) {
    this.specialTaskDescriptions = SPECIAL_TASKS_DESCRIPTIONS;
  }

  ngOnInit() {
    this.form = this.formService.makeSpecialForm(this.data);
    this.formValueChanges();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.data = changes.data.currentValue;
    this.form = this.formService.makeSpecialForm(this.data);
    this.formValueChanges();
  }

  getTotalHours() {
    let totalHours = 0;
    this.form.value.forEach((item, itemkIndex) => {
      item.specialTasks.forEach((task, taskIndex) => {
        if (taskIndex !== 6) {
          totalHours += Number(task.hours);
        }
      });
    });
    this.onTotalHoursChange.emit(totalHours);
  }

  formValueChanges() {
    this.getTotalHours();
    this.form.valueChanges.pipe(debounceTime(500)).subscribe(values => {
      const formValue = this.formService.getForm().getRawValue();
      const content = this.parseToXmlService.parseToXml(formValue);
      this.mainService.saveFile(path.join(localStorage.getItem('folderPath'), localStorage.getItem('selectedFile')), content);
    });
  }

  addSpecialItem() {
    const emptySpecialItem: SpecialItemModel = null;
    this.form.controls.push(this.formService.makeSpecialItemForm(emptySpecialItem));
  }

  addSpecialTask(specialItem) {
    const emptySpecialTask: SpecialTaskModel = null;
    specialItem.controls.specialTasks.push(this.formService.makeSpecialTaskForm(emptySpecialTask));
  }

  getDescriptionForName(name: string): string {
    return this.specialTaskDescriptions.find(specialTask => specialTask.name === name).description;
  }

}
