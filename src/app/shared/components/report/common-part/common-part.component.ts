import {Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges} from '@angular/core';
import { FormBuilder, FormArray } from '@angular/forms';
import {Subscription} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import * as moment from 'moment';

import { ProjectModel } from '../../../../core/models/report.model';
import { EmployeeModel } from '../../../../core/models/report.model';
import { TaskModel } from '../../../../core/models/report.model';
import { SPECIAL_TASKS } from '../../../../core/models/special-tasks-data';

import { FormServiceService } from '../../../../core/services/form-service.service';
import {ParseToXmlService} from '../../../../core/services/parse-to-xml.service';
import {MainService} from '../../../../core/services/main.service';
import {SpecialItemModel} from '../../../../core/models/specialItem.model';
import * as path from 'path';

@Component({
  selector: 'app-common-part',
  templateUrl: './common-part.component.html',
  styleUrls: ['./common-part.component.scss']
})
export class CommonPartComponent implements OnInit, OnChanges {

  @Input() data: any;
  @Output() onTotalHoursChange = new EventEmitter<number>();
  form: FormArray;
  public employeeHoursArray;
  totalHours;
  subscription: Subscription;

  public currentDate = moment().format('YYYY-MM-DD');

  constructor(
    private formBuilder: FormBuilder,
    private formService: FormServiceService,
    private parseToXmlService: ParseToXmlService,
    private mainService: MainService,
  ) {}

  getEmployeeHours() {
    this.employeeHoursArray = [];
    this.form.value.forEach((project, projectIndex) => {
      this.employeeHoursArray.push([[0]]);
      project.employee.forEach((empl, emplIndex) => {
        let sum = 0;
        empl.tasks.forEach(task => sum += Number(task.hours));
        this.employeeHoursArray[projectIndex][emplIndex] = sum;
      });
    });
    this.getTotalHours();
  }

  getTotalHours() {
    this.totalHours = 0;
    this.employeeHoursArray.forEach(project => {
      project.forEach(hour => {
        this.totalHours += hour;
      });
    });
    this.onTotalHoursChange.emit(this.totalHours);
  }

  ngOnInit() {
    this.form = this.formService.makeCommonForm(this.data.common);
    this.formValueChanges();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.data = changes.data.currentValue;
    this.form = this.formService.makeCommonForm(this.data.common);
    this.formValueChanges();
  }

  formValueChanges() {
    this.getEmployeeHours();
    this.form.valueChanges.pipe(debounceTime(500)).subscribe(values => {
      this.getEmployeeHours();
      const uniqueEmployee = new Set();
      values.forEach(project => {
        project.employee.forEach(empl => {
          uniqueEmployee.add(empl.name);
        });
      });
      const formValue = this.formService.getForm().getRawValue();

      const specialItems: SpecialItemModel[] = [];
      uniqueEmployee.forEach(empl => {
        const index = formValue.specialTasks.findIndex(element => element.employeeName === empl);
        if (index !== -1) {
          specialItems.push(formValue.specialTasks[index]);
        } else {
          const newSpecialItem: SpecialItemModel = new SpecialItemModel();
          newSpecialItem.employeeName = String(empl);
          newSpecialItem.rate = 0;
          newSpecialItem.specialTasks = SPECIAL_TASKS;
          specialItems.push(newSpecialItem);
        }
      });
      formValue.specialTasks = specialItems;
      this.data.specialTasks = specialItems;

      /**
       * trim() для каждого названия задачи
       */
      formValue.common.forEach(project => {
        project.employee.forEach(empl => {
          empl.tasks.forEach(task => {
            if (task.name !== null) { task.name.trim(); }
          });
        });
      });

      const content = this.parseToXmlService.parseToXml(formValue);
      this.mainService.saveFile(path.join(localStorage.getItem('folderPath'), localStorage.getItem('selectedFile')), content);
    });
  }

  addTask(empl) {
    const emptyTask: TaskModel = null;
    empl.controls.tasks.push(this.formService.makeTaskForm(emptyTask));
  }

  addEmployee(project) {
    const emptyEmpl: EmployeeModel = null;
    project.controls.employee.push(this.formService.makeEmployeeForm(emptyEmpl));
  }

  addProject() {
    const emptyPrj: ProjectModel = new ProjectModel();
    emptyPrj.employee.push(new EmployeeModel());
    emptyPrj.employee[0].tasks.push(new TaskModel());
    this.form.push(this.formService.makeProjectForm(emptyPrj));
  }

  deleteProject(index) {
    if ((<FormArray>this.form.get([index, 'employee'])).length > 0) {
      const conf = confirm('В этом проекте есть сотрудники. Вы уверены, что хотите его удалить?');
      if (conf) { this.form.removeAt(index); }
    } else { this.form.removeAt(index); }
  }

  deleteEmployee(proj, index) {
    if ((<FormArray>proj.get(['employee', index, 'tasks'])).length > 0) {
      const conf = confirm('Вы хотите удалить сотрудника, у которого есть задачи. Удалить?');
      if (conf) { proj.controls.employee.removeAt(index); }
    } else {  proj.controls.employee.removeAt(index); }
  }

  deleteTask(empl, index) {
    empl.controls.tasks.removeAt(index);
  }

}
